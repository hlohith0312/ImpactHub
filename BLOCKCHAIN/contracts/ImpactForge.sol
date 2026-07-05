// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ImpactForge
 * @dev Platform contract for NGO-student challenge agreements.
 *      Handles transparent challenge posting, milestone tracking,
 *      deliverable verification, and certificate issuance.
 */
contract ImpactForge {

    // ── Data Structures ──────────────────────────────────────

    struct Milestone {
        string  description;
        bool    completed;
        uint    completedAt;
    }

    struct Problem {
        uint    chainId;
        string  platformId;    // MongoDB _id
        string  contentHash;   // SHA-256 of title + description
        string  ngoId;         // MongoDB NGO user _id
        bool    isSolved;
        string  solverId;      // MongoDB student user _id
        uint    postedAt;
    }

    struct Certificate {
        uint    certId;
        string  platformProblemId;  // MongoDB problem _id
        string  studentId;          // MongoDB student _id
        string  solutionHash;       // SHA-256 of solution link + details
        uint    issuedAt;
        string  achievement;
    }

    // ── State ─────────────────────────────────────────────────

    address public platform;
    uint    public problemCount = 0;
    uint    public certCount    = 0;

    mapping(uint    => Problem)     public problems;
    mapping(uint    => Certificate) public certificates;
    mapping(uint    => Milestone[]) public milestones;
    mapping(string  => uint[])      public studentCertIds;

    // ── Events ────────────────────────────────────────────────

    event ProblemPosted(
        uint    indexed chainId,
        string          platformId,
        string          ngoId,
        string          contentHash,
        uint            timestamp
    );

    event MilestoneAdded(
        uint    indexed problemChainId,
        uint            milestoneIndex,
        string          description
    );

    event MilestoneCompleted(
        uint    indexed problemChainId,
        uint            milestoneIndex,
        uint            timestamp
    );

    event CertificateIssued(
        uint    indexed certId,
        string          platformProblemId,
        string          studentId,
        string          solutionHash,
        uint            timestamp
    );

    // ── Modifiers ─────────────────────────────────────────────

    constructor() {
        platform = msg.sender;
    }

    modifier onlyPlatform() {
        require(msg.sender == platform, "ImpactForge: caller is not the platform");
        _;
    }

    // ── Functions ─────────────────────────────────────────────

    /**
     * @notice NGO posts a new challenge. Called by the platform backend.
     * @param _platformId  MongoDB _id of the problem document
     * @param _ngoId       MongoDB _id of the NGO user
     * @param _contentHash SHA-256 hash of the challenge title + description
     */
    function postProblem(
        string memory _platformId,
        string memory _ngoId,
        string memory _contentHash
    ) external onlyPlatform returns (uint) {
        require(bytes(_contentHash).length > 0, "ImpactForge: content hash required");

        problemCount++;
        problems[problemCount] = Problem({
            chainId:     problemCount,
            platformId:  _platformId,
            contentHash: _contentHash,
            ngoId:       _ngoId,
            isSolved:    false,
            solverId:    "",
            postedAt:    block.timestamp
        });

        emit ProblemPosted(problemCount, _platformId, _ngoId, _contentHash, block.timestamp);
        return problemCount;
    }

    /**
     * @notice Add a deliverable milestone to a challenge.
     * @param _chainProblemId  On-chain problem ID
     * @param _description     Milestone description
     */
    function addMilestone(
        uint   _chainProblemId,
        string memory _description
    ) external onlyPlatform {
        require(_chainProblemId > 0 && _chainProblemId <= problemCount, "ImpactForge: invalid problem");
        require(!problems[_chainProblemId].isSolved, "ImpactForge: problem already solved");

        milestones[_chainProblemId].push(Milestone({
            description: _description,
            completed:   false,
            completedAt: 0
        }));

        emit MilestoneAdded(_chainProblemId, milestones[_chainProblemId].length - 1, _description);
    }

    /**
     * @notice Mark a milestone as completed (deliverable verified).
     */
    function completeMilestone(
        uint _chainProblemId,
        uint _milestoneIndex
    ) external onlyPlatform {
        require(_chainProblemId > 0 && _chainProblemId <= problemCount, "ImpactForge: invalid problem");
        require(_milestoneIndex < milestones[_chainProblemId].length, "ImpactForge: invalid milestone");
        require(!milestones[_chainProblemId][_milestoneIndex].completed, "ImpactForge: already completed");

        milestones[_chainProblemId][_milestoneIndex].completed   = true;
        milestones[_chainProblemId][_milestoneIndex].completedAt = block.timestamp;

        emit MilestoneCompleted(_chainProblemId, _milestoneIndex, block.timestamp);
    }

    /**
     * @notice NGO accepts a student's solution and issues a certificate on-chain.
     * @param _chainProblemId  On-chain problem ID
     * @param _studentId       MongoDB student _id
     * @param _solutionHash    SHA-256 of the solution link + student name
     * @return certId          The on-chain certificate ID
     */
    function acceptSolution(
        uint   _chainProblemId,
        string memory _studentId,
        string memory _solutionHash
    ) external onlyPlatform returns (uint) {
        require(_chainProblemId > 0 && _chainProblemId <= problemCount, "ImpactForge: invalid problem");
        Problem storage p = problems[_chainProblemId];
        require(!p.isSolved, "ImpactForge: already solved");
        require(bytes(_solutionHash).length > 0, "ImpactForge: solution hash required");

        p.isSolved  = true;
        p.solverId  = _studentId;

        certCount++;
        certificates[certCount] = Certificate({
            certId:            certCount,
            platformProblemId: p.platformId,
            studentId:         _studentId,
            solutionHash:      _solutionHash,
            issuedAt:          block.timestamp,
            achievement:       "ImpactForge Verified Impact Developer"
        });
        studentCertIds[_studentId].push(certCount);

        emit CertificateIssued(certCount, p.platformId, _studentId, _solutionHash, block.timestamp);
        return certCount;
    }

    // ── View Functions ────────────────────────────────────────

    function getMilestones(uint _chainProblemId) external view returns (Milestone[] memory) {
        return milestones[_chainProblemId];
    }

    function getStudentCertIds(string memory _studentId) external view returns (uint[] memory) {
        return studentCertIds[_studentId];
    }

    function getCertificate(uint _certId) external view returns (Certificate memory) {
        return certificates[_certId];
    }
}