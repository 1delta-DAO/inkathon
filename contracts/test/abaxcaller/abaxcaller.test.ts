import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { BN } from '@polkadot/util'
import { ASSETS } from '../../data/assets'
import { address } from '../../deployments/addresses/abaxcaller/development'
import Abax from '../../typed_contracts/contracts/abax'
import AbaxCaller from '../../typed_contracts/contracts/abaxcaller'
import PSP22 from '../../typed_contracts/contracts/psp22'
import { contractTx } from '../helpers'

const TIMEOUT = 60000
const ENDPOINT = process.env.LOCAL_ENDPOINT

const ABAX_ADDRESS = '5GBai32Vbzizw3xidVUwkjzFydaas7s2B8uudgtiguzmW8yn'
const ABAX_FUNCTION_SET_AS_COLLATERAL = 'LendingPoolBorrow::set_as_collateral'
const ABAX_FUNCTION_FLASH_LOAN = 'LendingPoolFlash::flash_loan'

const CALLER_FUNCTION_APPROVE = 'approve'
const CALLER_FUNCTION_DEPOSIT = 'deposit'
const CALLER_FUNCTION_REDEEM = 'redeem'
const CALLER_FUNCTION_BORROW = 'borrow'
const CALLER_FUNCTION_REPAY = 'repay'

const TOKEN_FUNCTION_APPROVE = 'PSP22::approve'

const MAXUINT128 = new BN(2).pow(new BN(128)).sub(new BN(1))

describe('Abaxcaller contract interactions', () => {
  let api: ApiPromise
  let account: KeyringPair
  let abaxCaller: AbaxCaller
  let abax: Abax
  let callAbax: (functionName: string, args: any[], caller?: KeyringPair) => Promise<any>
  
  beforeAll(async () => {
    const provider = new WsProvider(ENDPOINT)
    api = await ApiPromise.create({ provider })
    account = new Keyring({ type: 'sr25519' }).addFromUri('//Alice', { name: 'Alice' })

    abaxCaller = new AbaxCaller(address, account, api)
    abax = new Abax(ABAX_ADDRESS, account, api)

    // call abax protocol from account via name and args
    callAbax = async (functionName: string, args: any[], caller?: KeyringPair) => await contractTx(
      api,
      caller ?? account,
      abax.nativeContract,
      functionName,
      args,
    ).catch((error) => {
      console.error('Set collateral transaction error:', error)
    })
  })

  afterAll(async () => {
    api.disconnect()
  })

  test(
    'Contract function call deposit',
    async () => {
      const asset = 'DAI'
      const depositAmount = new BN(100).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_APPROVE,
        maxApproveArgs,
      ).catch((error) => {
        console.error('Max approve transaction error:', error)
      })

      // approve for deposit: owner = account, spender = AbaxCaller
      const token = new PSP22(ASSETS[asset].address, account, api)
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        token.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveDepositArgs,
      ).catch((error) => {
        console.error('Approve deposit transaction error:', error)
      })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await callAbax(CALLER_FUNCTION_DEPOSIT, depositArgs)

      // view user reserve data for verification
      const reserveData = (
        await abax.query.viewUserReserveData(ASSETS[asset].address, account.address)
      ).value.unwrap()

      const realizedDepositAmount = reserveData.deposit.rawNumber
      expect(realizedDepositAmount.eq(depositAmount)).toBeTruthy()
    },
    TIMEOUT,
  )

  test(
    'Contract function calls deposit, withdraw',
    async () => {
      const asset = 'WETH'
      const token = new PSP22(ASSETS[asset].address, account, api)

      const initBalance = (await token.query.balanceOf(account.address)).value.unwrap().rawNumber
      const depositAmount = new BN(5).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))
      const withdrawAmount = new BN(3).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_APPROVE,
        maxApproveArgs,
      ).catch((error) => {
        console.error('Max approve transaction error:', error)
      })

      // approve for deposit: owner = account, spender = AbaxCaller
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        token.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveDepositArgs,
      ).catch((error) => {
        console.error('Approve deposit transaction error:', error)
      })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_DEPOSIT,
        depositArgs,
      ).catch((error) => {
        console.error('Deposit transaction error:', error)
      })

      // approve collateral token for withdrawal: owner = account, spender = AbaxCaller
      const approveCollateralTokenArgs = [address, withdrawAmount]
      const collateralToken = new PSP22(ASSETS[asset].aTokenAddress, account, api)
      await contractTx(
        api,
        account,
        collateralToken.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveCollateralTokenArgs,
      ).catch((error) => {
        console.error('Approve collateral transaction error:', error)
      })

      // call withdraw function in AbaxCaller contract
      const withdrawArgs = [ASSETS[asset].address, withdrawAmount, []]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_REDEEM,
        withdrawArgs,
      ).catch((error) => {
        console.error('Withdraw transaction error:', error)
      })

      // view token balance for verification
      const realizedAmount = (await token.query.balanceOf(account.address)).value.unwrap().rawNumber

      const expectedAmount = initBalance.sub(depositAmount).add(withdrawAmount)
      expect(realizedAmount.eq(expectedAmount)).toBeTruthy()
    },
    TIMEOUT,
  )

  test(
    'Contract function calls deposit, borrow',
    async () => {
      const asset = 'USDC'
      const token = new PSP22(ASSETS[asset].address, account, api)

      const initBalance = (await token.query.balanceOf(account.address)).value.unwrap().rawNumber
      const depositAmount = new BN(5000).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))
      const borrowAmount = new BN(100).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_APPROVE,
        maxApproveArgs,
      ).catch((error) => {
        console.error('Max approve transaction error:', error)
      })

      // approve for deposit: owner = account, spender = AbaxCaller
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        token.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveDepositArgs,
      ).catch((error) => {
        console.error('Approve deposit transaction error:', error)
      })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_DEPOSIT,
        depositArgs,
      ).catch((error) => {
        console.error('Deposit transaction error:', error)
      })

      // approve for borrow: owner = account, spender = AbaxCaller
      const debtToken = new PSP22(ASSETS[asset].vTokenAddress, account, api)
      const approveBorrowArgs = [address, borrowAmount]
      await contractTx(
        api,
        account,
        debtToken.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveBorrowArgs,
      ).catch((error) => {
        console.error('Approve borrow transaction error:', error)
      })

      // set deposit as collateral
      const setCollateralArgs = [ASSETS[asset].address, true]
      await contractTx(
        api,
        account,
        abax.nativeContract,
        ABAX_FUNCTION_SET_AS_COLLATERAL,
        setCollateralArgs,
      ).catch((error) => {
        console.error('Set collateral transaction error:', error)
      })

      // call borrow function in AbaxCaller contract
      const borrowArgs = [ASSETS[asset].address, borrowAmount, []]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_BORROW,
        borrowArgs,
      ).catch((error) => {
        console.error('Borrow transaction error:', error)
      })

      // view token balance for verification
      const realizedAmount = (await token.query.balanceOf(account.address)).value.unwrap().rawNumber

      const expectedAmount = initBalance.sub(depositAmount).add(borrowAmount)
      expect(realizedAmount.eq(expectedAmount)).toBeTruthy()
    },
    TIMEOUT,
  )

  test(
    'Contract function calls deposit, borrow, repay',
    async () => {
      const asset = 'AZERO'
      const token = new PSP22(ASSETS[asset].address, account, api)

      const initBalance = (await token.query.balanceOf(account.address)).value.unwrap().rawNumber
      const depositAmount = new BN(500).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))
      const borrowAmount = new BN(200).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))
      const repayAmount = new BN(100).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_APPROVE,
        maxApproveArgs,
      ).catch((error) => {
        console.error('Max approve transaction error:', error)
      })

      // approve for deposit: owner = account, spender = AbaxCaller
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        token.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveDepositArgs,
      ).catch((error) => {
        console.error('Approve deposit transaction error:', error)
      })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_DEPOSIT,
        depositArgs,
      ).catch((error) => {
        console.error('Deposit transaction error:', error)
      })

      // approve for borrow: owner = account, spender = AbaxCaller
      const debtToken = new PSP22(ASSETS[asset].vTokenAddress, account, api)
      const approveBorrowArgs = [address, borrowAmount]
      await contractTx(
        api,
        account,
        debtToken.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveBorrowArgs,
      ).catch((error) => {
        console.error('Approve borrow transaction error:', error)
      })

      // set deposit as collateral
      const setCollateralArgs = [ASSETS[asset].address, true]
      await contractTx(
        api,
        account,
        abax.nativeContract,
        ABAX_FUNCTION_SET_AS_COLLATERAL,
        setCollateralArgs,
      ).catch((error) => {
        console.error('Set collateral transaction error:', error)
      })

      // call borrow function in AbaxCaller contract
      const borrowArgs = [ASSETS[asset].address, borrowAmount, []]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_BORROW,
        borrowArgs,
      ).catch((error) => {
        console.error('Borrow transaction error:', error)
      })

      // approve for repay: owner = account, spender = AbaxCaller
      const approveRepayArgs = [address, repayAmount]
      await contractTx(
        api,
        account,
        token.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveRepayArgs,
      ).catch((error) => {
        console.error('Approve repay transaction error:', error)
      })

      // call repay function in AbaxCaller contract
      const repayArgs = [ASSETS[asset].address, repayAmount, []]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_REPAY,
        repayArgs,
      ).catch((error) => {
        console.error('Repay transaction error:', error)
      })

      // view token balance for verification
      const realizedAmount = (await token.query.balanceOf(account.address)).value.unwrap().rawNumber

      const expectedAmount = initBalance.sub(depositAmount).add(borrowAmount).sub(repayAmount)
      expect(realizedAmount.eq(expectedAmount)).toBeTruthy()
    },
    TIMEOUT,
  )

  test(
    'Contract function calls deposit, flashloan (deposit and borrow)',
    async () => {
      const asset = 'DOT'
      const depositAmount = new BN(200).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))
      const flashLoanAmount = new BN(50).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_APPROVE,
        maxApproveArgs,
      ).catch((error) => {
        console.error('Max approve transaction error:', error)
      })

      // approve for deposit: owner = account, spender = AbaxCaller
      const token = new PSP22(ASSETS[asset].address, account, api)
      const approveDepositArgs = [address, depositAmount]
      await contractTx(
        api,
        account,
        token.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveDepositArgs,
      ).catch((error) => {
        console.error('Approve deposit transaction error:', error)
      })

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await contractTx(
        api,
        account,
        abaxCaller.nativeContract,
        CALLER_FUNCTION_DEPOSIT,
        depositArgs,
      ).catch((error) => {
        console.error('Deposit transaction error:', error)
      })

      // approve for borrow in flash Loan: owner = account, spender = AbaxCaller
      const debtToken = new PSP22(ASSETS[asset].vTokenAddress, account, api)
      const approveBorrowArgs = [address, flashLoanAmount]
      await contractTx(
        api,
        account,
        debtToken.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveBorrowArgs,
      ).catch((error) => {
        console.error('Approve borrow transaction error:', error)
      })

      // set deposit as collateral
      const setCollateralArgs = [ASSETS[asset].address, true]
      await contractTx(
        api,
        account,
        abax.nativeContract,
        ABAX_FUNCTION_SET_AS_COLLATERAL,
        setCollateralArgs,
      ).catch((error) => {
        console.error('Set collateral transaction error:', error)
      })

      // call flash loan function in AbaxCaller contract
      const encodedAccountId = api.createType('AccountId', account.address).toHex()
      const flashLoanArgs = [address, [ASSETS[asset].address], [flashLoanAmount], encodedAccountId]
      await contractTx(
        api,
        account,
        abax.nativeContract,
        ABAX_FUNCTION_FLASH_LOAN,
        flashLoanArgs,
      ).catch((error) => {
        console.error('Flash loan transaction error:', error)
      })

      // view token balance for verification
      const realizedAmount = (await debtToken.query.balanceOf(account.address)).value.unwrap()
        .rawNumber

      expect(realizedAmount.gte(flashLoanAmount)).toBeTruthy()
    },
    TIMEOUT,
  )
})
