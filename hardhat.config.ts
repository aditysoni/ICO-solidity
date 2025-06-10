// Get the environment configuration from .env file
//
// To make use of automatic environment setup:
// - Duplicate .env.example file and name it .env
// - Fill in the environment variables

import '@nomicfoundation/hardhat-verify';
import 'dotenv/config';

import 'hardhat-deploy';
import 'hardhat-contract-sizer';
import '@nomiclabs/hardhat-ethers';
import '@layerzerolabs/toolbox-hardhat';

import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types';
import { EndpointId } from '@layerzerolabs/lz-definitions';

// Set your preferred authentication method
//
// If you prefer using a mnemonic, set a MNEMONIC environment variable
// to a valid mnemonic.
const MNEMONIC = process.env.MNEMONIC;

// If you prefer to authenticate using a private key, set a PRIVATE_KEY environment variable.
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Configure accounts for network access
const accounts: HttpNetworkAccountsUserConfig | undefined = MNEMONIC
  ? { mnemonic: MNEMONIC }
  : PRIVATE_KEY
  ? [PRIVATE_KEY]
  : undefined;

// Warn the user if no authentication method is configured
if (!accounts) {
  console.warn(
    'WARNING: Could not find MNEMONIC or PRIVATE_KEY environment variables. Transactions cannot be executed.'
  );
}

// Define the Hardhat configuration
const config: HardhatUserConfig = {
  paths: {
    cache: 'cache/hardhat', // Custom cache path
  },
  solidity: {
    compilers: [
      {
        version: '0.8.22', // Primary Solidity version
        settings: {
          optimizer: {
            enabled: true,
            runs: 200, // Optimize for deployment cost
          },
        },
      },
      {
        version: '0.5.17', // Secondary Solidity version for legacy support
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    // Arbitrum Sepolia Testnet
    'arbitrum-sepolia': {
      url: 'https://arbitrum-sepolia-rpc.publicnode.com',
      accounts,
    },
    // Sepolia Testnet
    sepolia: {
      url: 'https://eth-sepolia.g.alchemy.com/v2/VgYGSXQuaq5JRrhzm8jqofAX_RC9WTiq',
      accounts,
    },
    // Hardhat Network (local)
    // hardhat: {
    //   allowUnlimitedContractSize: true, // Enable unlimited contract size for testing
    // },
  },
  etherscan: {
    apiKey: {
      sepolia: 'VgYGSXQuaq5JRrhzm8jqofAX_RC9WTiq', // API key for verifying contracts on Sepolia
    },
  },
  sourcify : {
    enabled : false,
  },
  namedAccounts: {
    deployer: {
      default: 0, // Use the first wallet address from accounts
    },
  },
};

export default config;