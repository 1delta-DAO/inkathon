import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { Keyring } from '@polkadot/keyring'
import { IKeyringPair } from '@polkadot/types/types'
import { address } from '../../deployments/addresses/abaxcaller/development'
import callerAbiPath from '../../deployments/files/abaxcaller/abaxcaller.json'
import psp22AbiPath from '../../deployments/files/psp22/psp22.json'
import { contractQuery, contractTx, decodeOutput } from '../helpers'
import abaxAbiPath from '../metadata/abax.json'

const TIMEOUT = 60000
const ENDPOINT = 'ws://localhost:9944'
const ALICE_ADDRESS_ENCODED = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d'

const ABAX_ADDRESS = '5GBai32Vbzizw3xidVUwkjzFydaas7s2B8uudgtiguzmW8yn'
const ABAX_FUNCTION_VIEW_USER_RESERVE_DATA = 'LendingPoolView::view_user_reserve_data'
const ABAX_FUNCTION_SET_AS_COLLATERAL = 'LendingPoolBorrow::set_as_collateral'
const ABAX_FUNCTION_FLASH_LOAN = 'LendingPoolFlash::flash_loan'

const CALLER_FUNCTION_APPROVE = 'approve'
const CALLER_FUNCTION_DEPOSIT = 'deposit'
const CALLER_FUNCTION_REDEEM = 'redeem'
const CALLER_FUNCTION_BORROW = 'borrow'
const CALLER_FUNCTION_REPAY = 'repay'

const TOKEN_FUNCTION_APPROVE = 'PSP22::approve'
const TOKEN_FUNCTION_BALANCEOF = 'PSP22::balanceOf'

const MAXUINT128 = 2n ** 128n - 1n

const BALANCES = {
  DAI: 100000000000n,
  USDC: 100000000000n,
  WETH: 50000000000000000000n,
  BTC: 500000000n,
  AZERO: 100000000000000000n,
  DOT: 20000000000000000n,
}

const ASSETS = {
  DAI: {
    address: '5ELYqHS8YZ2hAEnCiqGJg8Ztc6JoFFKHpvgUbuz9oW9vc5at',
    aTokenAddress: '5GusvrnNEfYThkDxdSUZRca9ScTiVyrF3S76UJEQTUXBDdmT',
    vTokenAddress: '5EkScoCUiXCraQw5kSbknbugVEhWod9xMv4PRkyo9MHTREXw',
    decimals: 6,
  },
  USDC: {
    address: '5GXDPgrjJC7cyr9B1jCm5UqLGuephaEKGoAeHKfodB3TVghP',
    aTokenAddress: '5EVfH2BRm2ggimfRcuEH8zRYkviyEN69et4fDjHWHzWjirBK',
    vTokenAddress: '5CdF6Vdf9mAG5fjhFuNaLfFLj9i31SjxBsVj5JHBARmL5Xmd',
    decimals: 6,
  },
  WETH: {
    address: '5DgMoQHDKSJryNGR4DXo5H267Hmnf9ph5ZMLPXBtPxcZfN3P',
    aTokenAddress: '5DvMrRU79zS29FSSP5k8CyuCK2de59Xvvqwzbm1UzqNWwxFY',
    vTokenAddress: '5HY4mmPQuMDakTDeaf6Cj5TJaSbmb7G3fHczcyuyhmU6UeVR',
    decimals: 18,
  },
  BTC: {
    address: '5CJCSzTY2wZQaDp9PrzC1LsVfTEp9sGBHcAY3vjv9JLakfX9',
    aTokenAddress: '5GZm7bsGE53Gyf9Cg2GwsTjDrP9skY6A6uSZiCFWDoEZyMtj',
    vTokenAddress: '5EEurzNsm5SMDSJBHbtu4GHbkdSsHdjPbWNb28vxpEWkZJWX',
    decimals: 8,
  },
  AZERO: {
    address: '5CLLmNswXre58cuz6hBnyscpieFYUyqq5vwvopiW3q41SSYF',
    aTokenAddress: '5Da8px1HEoAvs3m9i55ftfSswDbskqCY4rHr1KAFsTqfiTia',
    vTokenAddress: '5ChJnTSpsQ26zJGyGt7uHHLRjbquAy1JSmaijMujUi9VKfJL',
    decimals: 12,
  },
  DOT: {
    address: '5EwcHvcGBC9jnVzmPJUzwgZJLxUkrWCzzZfoqpjZ45o9C9Gh',
    aTokenAddress: '5D1dwQEhyXzVDuB8RX85xm9iNa4pTtUr2jVpYHNFte7FxRTw',
    vTokenAddress: '5HDidr2RT4VGkxyGuJieGAfqYpqphwviB4WULaNp6VNsf2B2',
    decimals: 12,
  },
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
  })

  afterAll(async () => {
    api.disconnect()
  })

  test(
    'Contract function call deposit',
    async () => {
      const asset = 'DAI'
      const depositAmount = 100n * 10n ** BigInt(ASSETS[asset].decimals)

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_APPROVE,
        undefined,
        maxApproveArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // approve for deposit: owner = account, spender = AbaxCaller
      const tokenContract = new ContractPromise(api, psp22AbiPath, ASSETS[asset].address)
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        tokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveDepositArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_DEPOSIT,
        undefined,
        depositArgs,
      )
        .then((result) => {
          console.log('Deposit transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Deposit transaction error:', error)
        })

      // view user reserve data for verification
      const viewUserReserveDataArgs = [ASSETS[asset].address, account.address]
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
      }

      const realizedDepositAmount = BigInt(parseInt(output['deposit'].replace(/,/g, ''), 10))
      expect(realizedDepositAmount).toBe(depositAmount)
    },
    TIMEOUT,
  )

  test(
    'Contract function calls deposit, withdraw',
    async () => {
      const asset = 'WETH'
      const depositAmount = 5n * 10n ** BigInt(ASSETS[asset].decimals)
      const withdrawAmount = 3n * 10n ** BigInt(ASSETS[asset].decimals)

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_APPROVE,
        undefined,
        maxApproveArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // approve for deposit: owner = account, spender = AbaxCaller
      const tokenContract = new ContractPromise(api, psp22AbiPath, ASSETS[asset].address)
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        tokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveDepositArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_DEPOSIT,
        undefined,
        depositArgs,
      )
        .then((result) => {
          console.log('Deposit transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Deposit transaction error:', error)
        })

      // approve collateral token for withdrawal: owner = account, spender = AbaxCaller
      const approveCollateralTokenArgs = [address, withdrawAmount]
      const collateralTokenContract = new ContractPromise(
        api,
        psp22AbiPath,
        ASSETS[asset].aTokenAddress,
      )
      await contractTx(
        api,
        account,
        collateralTokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveCollateralTokenArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // call withdraw function in AbaxCaller contract
      const withdrawArgs = [ASSETS[asset].address, withdrawAmount, []]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_REDEEM,
        undefined,
        withdrawArgs,
      )
        .then((result) => {
          console.log('Withdraw transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Withdraw transaction error:', error)
        })

      // view token balance for verification
      const tokenBalanceArgs = [account.address]
      const result = await contractQuery(
        api,
        account.address,
        tokenContract,
        TOKEN_FUNCTION_BALANCEOF,
        undefined,
        tokenBalanceArgs,
      )

      const { output, isError, decodedOutput } = decodeOutput(
        result,
        tokenContract,
        TOKEN_FUNCTION_BALANCEOF,
      )

      if (isError) {
        console.error('Error', output)
      }

      const realizedAmount = BigInt(parseInt(decodedOutput.replace(/,/g, ''), 10))
      const expectedAmount = BALANCES[asset] - depositAmount + withdrawAmount
      expect(realizedAmount).toBe(expectedAmount)
    },
    TIMEOUT,
  )

  test(
    'Contract function calls deposit, borrow',
    async () => {
      const asset = 'USDC'
      const depositAmount = 5000n * 10n ** BigInt(ASSETS[asset].decimals)
      const borrowAmount = 100n * 10n ** BigInt(ASSETS[asset].decimals)

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_APPROVE,
        undefined,
        maxApproveArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // approve for deposit: owner = account, spender = AbaxCaller
      const tokenContract = new ContractPromise(api, psp22AbiPath, ASSETS[asset].address)
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        tokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveDepositArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_DEPOSIT,
        undefined,
        depositArgs,
      )
        .then((result) => {
          console.log('Deposit transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Deposit transaction error:', error)
        })

      // approve for borrow: owner = account, spender = AbaxCaller
      const debtTokenContract = new ContractPromise(api, psp22AbiPath, ASSETS[asset].vTokenAddress)
      const approveBorrowArgs = [address, borrowAmount]
      await contractTx(
        api,
        account,
        debtTokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveBorrowArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // Set deposit as collateral
      const setCollateralArgs = [ASSETS[asset].address, true]
      await contractTx(
        api,
        account,
        abaxContract,
        ABAX_FUNCTION_SET_AS_COLLATERAL,
        undefined,
        setCollateralArgs,
      )
        .then((result) => {
          console.log('Set collateral transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Set collateral  transaction error:', error)
        })

      // call borrow function in AbaxCaller contract
      const borrowArgs = [ASSETS[asset].address, borrowAmount, []]
      await contractTx(api, account, callerContract, CALLER_FUNCTION_BORROW, undefined, borrowArgs)
        .then((result) => {
          console.log('Borrow transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Borrow transaction error:', error)
        })

      // view token balance for verification
      const tokenBalanceArgs = [account.address]
      const result = await contractQuery(
        api,
        account.address,
        tokenContract,
        TOKEN_FUNCTION_BALANCEOF,
        undefined,
        tokenBalanceArgs,
      )

      const { output, isError, decodedOutput } = decodeOutput(
        result,
        tokenContract,
        TOKEN_FUNCTION_BALANCEOF,
      )

      if (isError) {
        console.error('Error', output)
      }

      const realizedAmount = BigInt(parseInt(decodedOutput.replace(/,/g, ''), 10))
      const expectedAmount = BALANCES[asset] - depositAmount + borrowAmount
      expect(realizedAmount).toBe(expectedAmount)
    },
    TIMEOUT,
  )

  test(
    'Contract function calls deposit, borrow, repay',
    async () => {
      const asset = 'BTC'
      const depositAmount = 5n * 10n ** BigInt(ASSETS[asset].decimals)
      const borrowAmount = 2n * 10n ** BigInt(ASSETS[asset].decimals)
      const repayAmount = 1n * 10n ** BigInt(ASSETS[asset].decimals)

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_APPROVE,
        undefined,
        maxApproveArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // approve for deposit: owner = account, spender = AbaxCaller
      const tokenContract = new ContractPromise(api, psp22AbiPath, ASSETS[asset].address)
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        tokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveDepositArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_DEPOSIT,
        undefined,
        depositArgs,
      )
        .then((result) => {
          console.log('Deposit transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Deposit transaction error:', error)
        })

      // approve for borrow: owner = account, spender = AbaxCaller
      const debtTokenContract = new ContractPromise(api, psp22AbiPath, ASSETS[asset].vTokenAddress)
      const approveBorrowArgs = [address, borrowAmount]
      await contractTx(
        api,
        account,
        debtTokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveBorrowArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // Set deposit as collateral
      const setCollateralArgs = [ASSETS[asset].address, true]
      await contractTx(
        api,
        account,
        abaxContract,
        ABAX_FUNCTION_SET_AS_COLLATERAL,
        undefined,
        setCollateralArgs,
      )
        .then((result) => {
          console.log('Set collateral transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Set collateral transaction error:', error)
        })

      // call borrow function in AbaxCaller contract
      const borrowArgs = [ASSETS[asset].address, borrowAmount, []]
      await contractTx(api, account, callerContract, CALLER_FUNCTION_BORROW, undefined, borrowArgs)
        .then((result) => {
          console.log('Borrow transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Borrow transaction error:', error)
        })

      // approve for repay: owner = account, spender = AbaxCaller
      const approveRepayArgs = [address, repayAmount]
      await contractTx(
        api,
        account,
        tokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveRepayArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // call repay function in AbaxCaller contract
      const repayArgs = [ASSETS[asset].address, repayAmount, []]
      await contractTx(api, account, callerContract, CALLER_FUNCTION_REPAY, undefined, repayArgs)
        .then((result) => {
          console.log('Repay transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Repay transaction error:', error)
        })

      // view token balance for verification
      const tokenBalanceArgs = [account.address]
      const result = await contractQuery(
        api,
        account.address,
        tokenContract,
        TOKEN_FUNCTION_BALANCEOF,
        undefined,
        tokenBalanceArgs,
      )

      const { output, isError, decodedOutput } = decodeOutput(
        result,
        tokenContract,
        TOKEN_FUNCTION_BALANCEOF,
      )

      if (isError) {
        console.error('Error', output)
      }

      const realizedAmount = BigInt(parseInt(decodedOutput.replace(/,/g, ''), 10))
      const expectedAmount = BALANCES[asset] - depositAmount + borrowAmount - repayAmount
      expect(realizedAmount).toBe(expectedAmount)
    },
    TIMEOUT,
  )

  test(
    'Contract function calls deposit, flashloan (deposit and borrow)',
    async () => {
      const asset = 'DOT'
      const depositAmount = 200n * 10n ** BigInt(ASSETS[asset].decimals)
      const flashLoanAmount = 50n * 10n ** BigInt(ASSETS[asset].decimals)

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_APPROVE,
        undefined,
        maxApproveArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // approve for deposit: owner = account, spender = AbaxCaller
      const tokenContract = new ContractPromise(api, psp22AbiPath, ASSETS[asset].address)
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        tokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveDepositArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_DEPOSIT,
        undefined,
        depositArgs,
      )
        .then((result) => {
          console.log('Deposit transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Deposit transaction error:', error)
        })

      // approve for borrow in flash Loan: owner = account, spender = AbaxCaller
      const debtTokenContract = new ContractPromise(api, psp22AbiPath, ASSETS[asset].vTokenAddress)
      const approveBorrowArgs = [address, flashLoanAmount]
      await contractTx(
        api,
        account,
        debtTokenContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveBorrowArgs,
      )
        .then((result) => {
          console.log('Approve transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve transaction error:', error)
        })

      // Set deposit as collateral
      const setCollateralArgs = [ASSETS[asset].address, true]
      await contractTx(
        api,
        account,
        abaxContract,
        ABAX_FUNCTION_SET_AS_COLLATERAL,
        undefined,
        setCollateralArgs,
      )
        .then((result) => {
          console.log('Set collateral transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Set collateral transaction error:', error)
        })

      // call flash loan function in AbaxCaller contract
      const encodedAccountId = api.createType('AccountId', account.address).toHex()
      const flashLoanArgs = [address, [ASSETS[asset].address], [flashLoanAmount], encodedAccountId]
      await contractTx(
        api,
        account,
        abaxContract,
        ABAX_FUNCTION_FLASH_LOAN,
        undefined,
        flashLoanArgs,
      )
        .then((result) => {
          console.log('Flash loan transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Flash loan transaction error:', error)
        })

      // view token balance for verification
      const tokenBalanceArgs = [account.address]
      const result = await contractQuery(
        api,
        account.address,
        debtTokenContract,
        TOKEN_FUNCTION_BALANCEOF,
        undefined,
        tokenBalanceArgs,
      )

      const { output, isError, decodedOutput } = decodeOutput(
        result,
        tokenContract,
        TOKEN_FUNCTION_BALANCEOF,
      )

      if (isError) {
        console.error('Error', output)
      }

      const realizedAmount = BigInt(parseInt(decodedOutput.replace(/,/g, ''), 10))
      const expectedAmount = flashLoanAmount
      expect(realizedAmount).toBeGreaterThanOrEqual(expectedAmount)
    },
    TIMEOUT,
  )
})
