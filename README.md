# DecentralizedExchange


A professional-grade Constant Product Automated Market Maker (AMM) implemented in Solidity. This project enables decentralized token swaps and liquidity provision using the $x \cdot y = k$ formula.

## 🚀 Overview

This repository contains the smart contracts, test suite, and deployment scripts for a DEX. It features:
- **Constant Product Market Making:** Efficient price discovery for token pairs.
- **Liquidity Provision:** Minting and burning of LP tokens proportional to pool share.
- **Fee Logic:** A standard 0.3% fee on swaps to reward liquidity providers.
- **Dockerized Environment:** Fully containerized setup for consistent testing and deployment.

## 🛠 Tech Stack
- **Smart Contracts:** Solidity ^0.8.0, OpenZeppelin
- **Development Framework:** Hardhat
- **Testing:** Mocha, Chai, Ethers.js
- **Containerization:** Docker, Docker Compose

---

## 📂 Project Structure
```text
dex-amm/
├── contracts/        # DEX and MockERC20 logic
├── test/             # Comprehensive 27-test suite
├── scripts/          # Deployment logic
├── Dockerfile        # Container build instructions
├── docker-compose.yml # Service orchestration
└── hardhat.config.js # Hardhat settings
🔧 Installation & SetupLocal SetupClone the repository and navigate to the project folder:Bashcd dex-amm
Install dependencies:Bashnpm install
Compile the contracts:Bashnpx hardhat compile
Docker Setup (Recommended)To run the project in an isolated environment without installing Node.js locally:Bashdocker-compose up -d --build
🧪 Running TestsStandard Test ExecutionRun the full suite of 27 unit tests to verify liquidity, swaps, and fee distribution:Bashnpx hardhat test
Inside DockerBashdocker-compose exec app npm test
Coverage ReportTo verify that the tests cover $\ge 80\%$ of the codebase (Current: 100%):Bashnpx hardhat coverage
📜 Smart Contract LogicThe Constant Product FormulaThe DEX relies on the mathematical invariant:$$x \times y = k$$Where:$x$ and $y$ are the reserves of the two tokens.$k$ is a constant that remains unchanged (excluding fees).Fee MechanismA 0.3% fee is applied to every swap. This fee is added to the pool's reserves, causing the constant $k$ to grow over time, which increases the value of LP tokens for liquidity providers.🏁 DeploymentTo deploy the contracts to the local Hardhat network:Bashnpx hardhat run scripts/deploy.js
📄 LicenseThis project is licensed under the MIT License
