import { deployContract } from '@scio-labs/use-inkathon'
import * as dotenv from 'dotenv'
import { getDeploymentData } from './utils/getDeploymentData'
import { initPolkadotJs } from './utils/initPolkadotJs'
import { writeContractAddresses } from './utils/writeContractAddresses'

const PRICE_ORACLE_ADDRESS_MAINNET = '5F7wPCMXX65RmL8oiuAFNKu2ydhvgcissDZ3NWZ5X85n2WPG'
const PRICE_ORACLE_ADDRESS_TESTNET = '5F5z8pZoLgkGapEksFWc2h7ZxH2vdh1A9agnhXvfdCeAfS9b'
const ABAX_ADDRESS_TESTNET = '5GBai32Vbzizw3xidVUwkjzFydaas7s2B8uudgtiguzmW8yn'
const ANDROMEDA_ROUTER_ADDRESS_TESTNET = '5ErbVfJHQSnFL9cERSP73v2EaaBJCxW16VuZiX4qv63KWS1T'

// [KEEP THIS] Dynamically load environment from `.env.{chainId}`
const chainId = process.env.CHAIN || 'development'
dotenv.config({
  path: `.env.${chainId}`,
})

/**
 * Script that deploys the contracts and writes its address to a file.
 *
 * Parameters:
 *  - `DIR`: Directory to read contract build artifacts (optional, defaults to `./deployments`)
 *  - `CHAIN`: Chain ID (optional, defaults to `development`)
 *
 * Example usage:
 *  - `pnpm run deploy`
 *  - `CHAIN=alephzero-testnet pnpm run deploy`
 */

const deploy_greeter = async () => {
  const initParams = await initPolkadotJs()
  const { api, chain, account } = initParams

  // Deploy greeter contract
  const { abi, wasm } = await getDeploymentData('greeter')
  const greeter = await deployContract(api, account, abi, wasm, 'default', [])

  // Write contract addresses to `{contract}/{network}.ts` file(s)
  await writeContractAddresses(chain.network, {
    greeter,
  })

  return greeter.address
}

const deploy_greeterwrapper = async (address) => {
  const initParams = await initPolkadotJs()
  const { api, chain, account } = initParams

  // Deploy greeter contract
  const { abi, wasm } = await getDeploymentData('greeterwrapper')
  const greeterwrapper = await deployContract(api, account, abi, wasm, 'new', [address])

  // Write contract addresses to `{contract}/{network}.ts` file(s)
  await writeContractAddresses(chain.network, {
    greeterwrapper,
  })
}

const deploy_oracleexample = async () => {
  let oracleAddress = ''
  if (chainId == 'alephzero') {
    oracleAddress = PRICE_ORACLE_ADDRESS_MAINNET
  } else if (chainId == 'alephzero-testnet') {
    oracleAddress = PRICE_ORACLE_ADDRESS_TESTNET
  }

  // Initialization
  const { api, chain, account } = await initPolkadotJs()

  // Deploy contract
  const { abi, wasm } = await getDeploymentData('oracleexample')
  const oracleexample = await deployContract(api, account, abi, wasm, 'new', [oracleAddress])

  // Write contract addresses to `{contract}/{network}.ts` file(s)
  await writeContractAddresses(chain.network, {
    oracleexample,
  })
}

const deploy_psp22 = async () => {
  const initParams = await initPolkadotJs()
  const { api, chain, account } = initParams

  const supply = 1000000
  const name = 'TestCoin'
  const symbol = 'TTC'
  const decimals = 8

  // Deploy greeter contract
  const { abi, wasm } = await getDeploymentData('psp22')
  const psp22 = await deployContract(api, account, abi, wasm, 'new', [
    supply,
    name,
    symbol,
    decimals,
  ])

  // Write contract addresses to `{contract}/{network}.ts` file(s)
  await writeContractAddresses(chain.network, {
    psp22,
  })
}

const deploy_andromedacaller = async () => {
  const initParams = await initPolkadotJs()
  const { api, chain, account } = initParams

  // Deploy greeter contract
  const { abi, wasm } = await getDeploymentData('andromedacaller')
  const andromedacaller = await deployContract(api, account, abi, wasm, 'new', [
    ANDROMEDA_ROUTER_ADDRESS_TESTNET,
  ])

  // Write contract addresses to `{contract}/{network}.ts` file(s)
  await writeContractAddresses(chain.network, {
    andromedacaller,
  })

  return andromedacaller.address
}

const deploy_abaxcaller = async (address) => {
  const initParams = await initPolkadotJs()
  const { api, chain, account } = initParams

  // Deploy greeter contract
  const { abi, wasm } = await getDeploymentData('abaxcaller')
  const abaxcaller = await deployContract(api, account, abi, wasm, 'new', [
    ABAX_ADDRESS_TESTNET,
    address,
  ])

  // Write contract addresses to `{contract}/{network}.ts` file(s)
  await writeContractAddresses(chain.network, {
    abaxcaller,
  })
}

const deployContracts = async () => {
  try {
    const greeter_address = await deploy_greeter()

    await deploy_greeterwrapper(greeter_address)

    await deploy_oracleexample()

    await deploy_psp22()

    const address = await deploy_andromedacaller()

    await deploy_abaxcaller(address)

    console.log('\nDeployments completed successfully')
  } catch (error) {
    console.error(error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

deployContracts()
