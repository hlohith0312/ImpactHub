// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ImpactForge
 * @dev Connects NGOs and Students with verifiable certificates.
 */
contract ImpactForge {
    
    // --- DATA STRUCTURES ---
    
    struct Problem {
        uint id;
        string contentHash;  // Hash of the problem details (from your PDF: "Hash of problem submissions" )
        address ngo;         // The NGO who posted it [cite: 105]
        bool isSolved;
        address solver;      // The student who solved it
    }

    struct Certificate {
        uint id;
        uint problemId;
        address student;
        uint timestamp;
        string achievement; // e.g., "Verified Impact Developer"
    }

    // --- STATE VARIABLES ---
    
    uint public problemCount = 0;
    uint public certCount = 0;
    
    mapping(uint => Problem) public problems;
    mapping(address => Certificate[]) public studentCertificates; // "NFT-based certificates" [cite: 142]

    // --- EVENTS (For Frontend to listen) ---
    
    event ProblemPosted(uint id, address indexed ngo, string contentHash);
    event CertificateIssued(uint id, address indexed student, uint problemId);

    // --- FUNCTIONS ---

    // 1. NGO posts a problem
    // "NGOs digitally sign submissions... Blockchain stores hashes" [cite: 109, 83]
    function postProblem(string memory _contentHash) public {
        require(bytes(_contentHash).length > 0, "Hash cannot be empty");
        
        problemCount++;
        problems[problemCount] = Problem(
            problemCount, 
            _contentHash, 
            msg.sender, 
            false, 
            address(0)
        );
        
        emit ProblemPosted(problemCount, msg.sender, _contentHash);
    }

    // 2. NGO accepts solution & Issues Certificate
    // "NGOs verify completed solutions off-chain" then record it here [cite: 49]
    function acceptSolution(uint _problemId, address _student) public {
        Problem storage p = problems[_problemId];
        
        // Security: Only the NGO who posted the problem can accept a solution
        require(msg.sender == p.ngo, "Only the NGO owner can accept solutions");
        require(!p.isSolved, "Problem is already solved");
        require(_student != address(0), "Invalid student address");

        // Mark as solved
        p.isSolved = true;
        p.solver = _student;

        // Issue Certificate
        certCount++;
        studentCertificates[_student].push(Certificate(
            certCount, 
            _problemId, 
            _student, 
            block.timestamp, 
            "ImpactForge Verified Solver"
        ));
        
        emit CertificateIssued(certCount, _student, _problemId);
    }

    // 3. View Function: Get all certs for a student
    function getStudentCerts(address _student) public view returns (Certificate[] memory) {
        return studentCertificates[_student];
    }
}