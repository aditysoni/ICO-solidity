# ICO SALE

## Setting up

You will need node version 20 to run the project.

- clone the project : `git clone https://github.com/aditysoni/B3X_TOKEN_SALE.git`
- run the command : `npm install`
- add the .env file and the environment variables as mentioned in the .env.example file

## Structure

```bash

├── contracts
│   ├──ICO
│   │   └── sale.sol
│   ├── mock
│   │   └── MockERC20.sol
│   └── token
│       ├── tokenX.sol
│       └── IMintable.sol
│
├── deploy 
│   └── tokenXDeployment.ts
│   
├── scripts
│   └── saleDeployment.ts
│
├── test
│   ├── hardhat
│   │   └── TGE.test.ts
└──  hardhat.config.ts

```

## Deployment

 For deployment of the token on desired chains use the following command : 
 
 - add the networks in the hardhat.config.ts file
 - run the command : `npx hardhat lz:deploy`
 
 For deployment of the sale smart contract : 

- Deploy the token on the chain you want to deploy your sale contract on . 
- add the token and usdc address in the saleDeployment.ts .
- run the command : `npx hardhat run scripts/saleDeployement.ts --network <network>`

## Testing

For testing the sale contract in the hardhat environment use the following command :
`npx hardhat test`




