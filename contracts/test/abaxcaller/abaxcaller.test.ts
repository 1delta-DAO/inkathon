import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { Keyring } from '@polkadot/keyring'
import { IKeyringPair } from '@polkadot/types/types'
import callerAbiPath from '../../deployments/abaxcaller/abaxcaller.json'
import { address } from '../../deployments/abaxcaller/development'
import psp22AbiPath from '../../deployments/psp22/psp22.json'
import { contractQuery, contractTx, decodeOutput } from '../helpers'
import abaxAbiPath from '../metadata/abax.json'

const ENDPOINT = 'ws://localhost:9944'
const ABAX_ADDRESS = '5GBai32Vbzizw3xidVUwkjzFydaas7s2B8uudgtiguzmW8yn'
const ABAX_FUNCTION_VIEW_USER_RESERVE_DATA = 'LendingPoolView::view_user_reserve_data'
const CALLER_FUNCTION_DEPOSIT = 'deposit'
const CALLER_FUNCTION_APPROVE = 'approve'
const TOKEN_FUNCTION_APPROVE = 'PSP22::approve'

const ASSETS = {
  DAI: '5ELYqHS8YZ2hAEnCiqGJg8Ztc6JoFFKHpvgUbuz9oW9vc5at',
  USDC: '5GXDPgrjJC7cyr9B1jCm5UqLGuephaEKGoAeHKfodB3TVghP',
  WETH: '5DgMoQHDKSJryNGR4DXo5H267Hmnf9ph5ZMLPXBtPxcZfN3P',
  BTC: '5CJCSzTY2wZQaDp9PrzC1LsVfTEp9sGBHcAY3vjv9JLakfX9',
  AZERO: '5CLLmNswXre58cuz6hBnyscpieFYUyqq5vwvopiW3q41SSYF',
  DOT: '5EwcHvcGBC9jnVzmPJUzwgZJLxUkrWCzzZfoqpjZ45o9C9Gh',
}

enum MarketRule {
  Default = 0,
  Stablecoins = 1,
  Crypto = 2,
}

describe('Abaxcaller contract interactions', () => {
  let api: ApiPromise
  let account: IKeyringPair
  let callerContract: ContractPromise
  let abaxContract: ContractPromise

  beforeAll(async () => {
    const provider = new WsProvider(ENDPOINT)
    api = await ApiPromise.create({ provider })
    account = new Keyring({ type: 'sr25519' }).addFromUri('//Alice', { name: 'Alice' })
    callerContract = new ContractPromise(api, callerAbiPath, address)
    abaxContract = new ContractPromise(api, abaxAbiPath, ABAX_ADDRESS)

    // max approve AbaxLendingPool contract for AbaxCaller contract
    const maxuint128 = 2n ** 128n - 1n
    const approveArgs = [ASSETS.DAI, ABAX_ADDRESS, maxuint128]
    await contractTx(api, account, callerContract, CALLER_FUNCTION_APPROVE, undefined, approveArgs)
      .then((result) => {
        console.log('Approve transaction finalized:', result)
      })
      .catch((error) => {
        console.error('Approve transaction error:', error)
      })
  })

  beforeEach(async () => [])

  afterAll(async () => {
    api.disconnect()
  })

  test('Contract function call deposit', async () => {
    const depositAmount = 1000
    const assetAddress = ASSETS.DAI

    // approve AbaxCaller cotnract for account
    const tokenContract = new ContractPromise(api, psp22AbiPath, assetAddress)
    const tokenArgs = [address, depositAmount]
    await contractTx(api, account, tokenContract, TOKEN_FUNCTION_APPROVE, undefined, tokenArgs)
      .then((result) => {
        console.log('Approve transaction finalized:', result)
      })
      .catch((error) => {
        console.error('Approve transaction error:', error)
      })

    // call deposit function in AbaxCaller cotnract
    const depositArgs = [assetAddress, depositAmount, []]
    await contractTx(api, account, callerContract, CALLER_FUNCTION_DEPOSIT, undefined, depositArgs)
      .then((result) => {
        console.log('Deposit transaction finalized:', result)
      })
      .catch((error) => {
        console.error('Deposit transaction error:', error)
      })

    // view user reserve data for verification
    const viewUserReserveDataArgs = [assetAddress, account.address]
    const result = await contractQuery(
      api,
      account.address,
      abaxContract,
      ABAX_FUNCTION_VIEW_USER_RESERVE_DATA,
      undefined,
      viewUserReserveDataArgs,
    )

    const { output, isError, decodedOutput } = decodeOutput(
      result,
      abaxContract,
      ABAX_FUNCTION_VIEW_USER_RESERVE_DATA,
    )

    if (isError) {
      console.error('Error', output)
    } else {
      console.log('Success', decodedOutput)
    }

    const realizedDepositAmount = parseInt(output['deposit'].replace(/,/g, ''), 10)
    expect(realizedDepositAmount).toBe(depositAmount)
  })
})
