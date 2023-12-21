import { ContractPromise } from '@polkadot/api-contract'
import Keyring from '@polkadot/keyring'
import { IKeyringPair } from '@polkadot/types/types'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { contractTx, getMaxGasLimit, transferBalance } from '@scio-labs/use-inkathon'
import { ASSETS } from '../data/assets'
import { address } from '../deployments/andromedacaller/development'
import psp22AbiPath from '../deployments/psp22/psp22.json'
import { getDeploymentData } from './utils/getDeploymentData'
import { initPolkadotJs } from './utils/initPolkadotJs'

const MINT_TOKENS_CONTRACT_ADDRESS = '5GYR6XGWx538v1TDcqCrXr3kFvL9QooAQbJSuu9rPcW7FGfy'
const MINT_TOKENS_CALL_DATA =
  '0xcfdd9aa2180beced56314a969d4c53eab5ddc11a5e486337b15706936f17dfa4ca0415002d00008a5d7845630100000000000000000a4a705114ac6fee6e67b77cd412ae5cdd1a4b889ddab55a4cfb701812b22f4e0065cd1d000000000000000000000000c528bcc49810233e55ff31d38430d037f37879f0a687e48e7e942b2be3741ee200e87648170000000000000000000000648e042d1a2dab16773cd4b9786adc501f13c238a4e4c93fe2867f16681393b200e876481700000000000000000000007f4b4027245ac4ae37521ced7a8def6799c7cadddf0b1f467e4fc7da8a6d7917000082dfe40d47000000000000000000476d8d6b4845b9ec96f45283a40bd54f20c33722c383bcc4a09a0c0be7b7b101000088b116afe3b50200000000000000'
const TOKEN_FUNCTION_APPROVE = 'PSP22::approve'

const POOLS = {
  WETHDAI: {
    WETH: 50n * 10n ** BigInt(ASSETS.WETH.decimals),
    DAI: 100000n * 10n ** BigInt(ASSETS.DAI.decimals),
  },
  BTCDAI: {
    BTC: 2n * 10n ** BigInt(ASSETS.BTC.decimals),
    DAI: 80000n * 10n ** BigInt(ASSETS.DAI.decimals),
  },
  AZERODAI: {
    AZERO: 66667n * 10n ** BigInt(ASSETS.AZERO.decimals),
    DAI: 100000n * 10n ** BigInt(ASSETS.DAI.decimals),
  },
  DOTDAI: {
    DOT: 15384n * 10n ** BigInt(ASSETS.DOT.decimals),
    DAI: 100000n * 10n ** BigInt(ASSETS.DAI.decimals),
  },
}

const main = async () => {
  const assets = ['WETH', 'BTC', 'AZERO', 'DOT']
  const stableAsset = 'DAI'
  const azeroAmount = 10n * 10n ** 12n

  const { api, account } = await initPolkadotJs()
  const { abi, wasm } = await getDeploymentData('andromedacaller')
  const contract = new ContractPromise(api, abi, address)

  for (const asset of assets) {
    const genericAcc = createAccount()

    await transferBalance(api, account, genericAcc.address, azeroAmount)

    await approveToken(api, genericAcc, asset, POOLS[asset + stableAsset][asset])
    await approveToken(api, genericAcc, stableAsset, POOLS[asset + stableAsset][stableAsset])

    await mintTokens(api, genericAcc)

    await createLiquidityPool(api, contract, genericAcc, asset, stableAsset)
  }
}

const createAccount = () => {
  const keyring = new Keyring({ type: 'sr25519' })
  const mnemonic = mnemonicGenerate()
  const newKeyring = keyring.addFromMnemonic(mnemonic)
  console.log('New Mnemonic:', mnemonic)
  console.log('New AccountId:', newKeyring.address)
  return newKeyring
}

const mintTokens = async (api, account) => {
  return new Promise((resolve, reject) => {
    try {
      const accountId = api.registry.createType('AccountId', account.address)
      const accountIdHex = accountId.toHex().replace('0x', '')
      const callData = MINT_TOKENS_CALL_DATA + accountIdHex

      const weight = getMaxGasLimit(api)

      api.tx.contracts
        .call(MINT_TOKENS_CONTRACT_ADDRESS, 0, weight, null, callData)
        .signAndSend(account, { nonce: -1 }, ({ status, events }) => {
          if (status.isInBlock) {
            console.log('Mint tokens transaction included in block: ' + status.asInBlock)
          } else if (status.isFinalized) {
            console.log('Mint tokens transaction finalized')
            resolve(events)
          }
        })
    } catch (error) {
      console.error('Error minting tokens: ', error)
      reject()
    }
  })
}

const approveToken = async (api, account: IKeyringPair, asset, amount) => {
  const contractPSP22 = new ContractPromise(api, psp22AbiPath, ASSETS[asset].address)
  await contractTx(api, account, contractPSP22, TOKEN_FUNCTION_APPROVE, {}, [address, amount])
    .then((result) => {
      console.log('Approve token transaction finalized: ', result.blockHash)
    })
    .catch((error) => {
      console.error('Approve token transaction error:', error)
    })
}

const createLiquidityPool = async (api, contract, account, asset, stableAsset) => {
  await contractTx(api, account, contract, 'create_psp22_liquidity_pool', {}, [
    ASSETS[asset].address,
    ASSETS[stableAsset].address,
    POOLS[asset + stableAsset][asset] / 100n,
    POOLS[asset + stableAsset][stableAsset] / 100n,
  ])
    .then((result) => {
      console.log('Create pool transaction finalized: ', result.blockHash)
    })
    .catch((error) => {
      console.error('Create pool transaction error:', error)
    })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => process.exit(0))
