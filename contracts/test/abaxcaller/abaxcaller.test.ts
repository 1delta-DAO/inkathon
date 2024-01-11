import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { BN, u8aToHex } from '@polkadot/util'
import { ASSETS } from '../../data/assets'
import { address as abaxCallerAddress } from '../../deployments/addresses/abaxcaller/development'
import { address as andromedaCallerAddress } from '../../deployments/addresses/andromedacaller/development'
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
const TOKEN_FUNCTION_TRANSFER = 'PSP22::transfer'

const MAXUINT128 = new BN(2).pow(new BN(128)).sub(new BN(1))

describe('Abaxcaller contract interactions', () => {
  let api: ApiPromise
  let account: KeyringPair
  let abax: Abax
  let abaxCaller: AbaxCaller
  let callAbaxCaller: (
    functionName: string,
    args: any[],
    caller?: KeyringPair,
    gasLimitFactor?: number,
  ) => Promise<any>
  let callAbax: (
    functionName: string,
    args: any[],
    caller?: KeyringPair,
    gasLimitFactor?: number,
  ) => Promise<any>
  let callContract: (
    contract: ContractPromise,
    functionName: string,
    args: any[],
    caller?: KeyringPair,
    gasLimitFactor?: number,
  ) => Promise<any>

  beforeAll(async () => {
    const provider = new WsProvider(ENDPOINT)
    api = await ApiPromise.create({ provider })
    account = new Keyring({ type: 'sr25519' }).addFromUri('//Alice', { name: 'Alice' })

    abax = new Abax(ABAX_ADDRESS, account, api)
    abaxCaller = new AbaxCaller(abaxCallerAddress, account, api)

    callContract = async (
      contract: ContractPromise,
      functionName: string,
      args: any[],
      caller: KeyringPair,
      gasLimitFactor?: number,
    ) => {
      await contractTx(api, caller ?? account, contract, functionName, args, gasLimitFactor).catch(
        (error) => {
          console.error(functionName, error)
        },
      )
    }

    callAbax = async (
      functionName: string,
      args: any[],
      caller?: KeyringPair,
      gasLimitFactor?: number,
    ) => await callContract(abax.nativeContract, functionName, args, caller, gasLimitFactor)

    callAbaxCaller = async (
      functionName: string,
      args: any[],
      caller?: KeyringPair,
      gasLimitFactor?: number,
    ) => await callContract(abaxCaller.nativeContract, functionName, args, caller, gasLimitFactor)
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
      await callAbaxCaller(CALLER_FUNCTION_APPROVE, maxApproveArgs)

      // approve for deposit: owner = account, spender = AbaxCaller
      const token = new PSP22(ASSETS[asset].address, account, api)
      const approveDepositArgs = [abaxCallerAddress, depositAmount]
      await callContract(token.nativeContract, TOKEN_FUNCTION_APPROVE, approveDepositArgs)

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await callAbaxCaller(CALLER_FUNCTION_DEPOSIT, depositArgs)

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
      await callAbaxCaller(CALLER_FUNCTION_APPROVE, maxApproveArgs)

      // approve for deposit: owner = account, spender = AbaxCaller
      const approveDepositArgs = [abaxCallerAddress, depositAmount]
      await callContract(token.nativeContract, TOKEN_FUNCTION_APPROVE, approveDepositArgs)

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await callAbaxCaller(CALLER_FUNCTION_DEPOSIT, depositArgs)

      // approve collateral token for withdrawal: owner = account, spender = AbaxCaller
      const approveCollateralTokenArgs = [abaxCallerAddress, withdrawAmount]
      const collateralToken = new PSP22(ASSETS[asset].aTokenAddress, account, api)
      await callContract(
        collateralToken.nativeContract,
        TOKEN_FUNCTION_APPROVE,
        approveCollateralTokenArgs,
      )

      // call withdraw function in AbaxCaller contract
      const withdrawArgs = [ASSETS[asset].address, withdrawAmount, []]
      await callAbaxCaller(CALLER_FUNCTION_REDEEM, withdrawArgs)

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
      await callAbaxCaller(CALLER_FUNCTION_APPROVE, maxApproveArgs)

      // approve for deposit: owner = account, spender = AbaxCaller
      const approveDepositArgs = [abaxCallerAddress, depositAmount]
      await callContract(token.nativeContract, TOKEN_FUNCTION_APPROVE, approveDepositArgs)

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await callAbaxCaller(CALLER_FUNCTION_DEPOSIT, depositArgs)

      // approve for borrow: owner = account, spender = AbaxCaller
      const debtToken = new PSP22(ASSETS[asset].vTokenAddress, account, api)
      const approveBorrowArgs = [abaxCallerAddress, borrowAmount]
      await callContract(debtToken.nativeContract, TOKEN_FUNCTION_APPROVE, approveBorrowArgs)

      // set deposit as collateral
      const setCollateralArgs = [ASSETS[asset].address, true]
      await callAbax(ABAX_FUNCTION_SET_AS_COLLATERAL, setCollateralArgs)

      // call borrow function in AbaxCaller contract
      const borrowArgs = [ASSETS[asset].address, borrowAmount, []]
      await callAbaxCaller(CALLER_FUNCTION_BORROW, borrowArgs)

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
      await callAbaxCaller(CALLER_FUNCTION_APPROVE, maxApproveArgs)

      // approve for deposit: owner = account, spender = AbaxCaller
      const approveDepositArgs = [abaxCallerAddress, depositAmount]
      await callContract(token.nativeContract, TOKEN_FUNCTION_APPROVE, approveDepositArgs)

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[asset].address, depositAmount, []]
      await callAbaxCaller(CALLER_FUNCTION_DEPOSIT, depositArgs)

      // approve for borrow: owner = account, spender = AbaxCaller
      const debtToken = new PSP22(ASSETS[asset].vTokenAddress, account, api)
      const approveBorrowArgs = [abaxCallerAddress, borrowAmount]
      await callContract(debtToken.nativeContract, TOKEN_FUNCTION_APPROVE, approveBorrowArgs)

      // set deposit as collateral
      const setCollateralArgs = [ASSETS[asset].address, true]
      await callAbax(ABAX_FUNCTION_SET_AS_COLLATERAL, setCollateralArgs)

      // call borrow function in AbaxCaller contract
      const borrowArgs = [ASSETS[asset].address, borrowAmount, []]
      await callAbaxCaller(CALLER_FUNCTION_BORROW, borrowArgs)

      // approve for repay: owner = account, spender = AbaxCaller
      const approveRepayArgs = [abaxCallerAddress, repayAmount]
      await callContract(token.nativeContract, TOKEN_FUNCTION_APPROVE, approveRepayArgs)

      // call repay function in AbaxCaller contract
      const repayArgs = [ASSETS[asset].address, repayAmount, []]
      await callAbaxCaller(CALLER_FUNCTION_REPAY, repayArgs)

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
      const asset = 'USDC'
      const stableAsset = 'DAI'
      const depositAmount = new BN(200).mul(new BN(10).pow(new BN(ASSETS[stableAsset].decimals)))
      const flashLoanAmount = new BN(50).mul(new BN(10).pow(new BN(ASSETS[asset].decimals)))

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveAbaxStableArgs = [ASSETS[stableAsset].address, ABAX_ADDRESS, MAXUINT128]
      await callAbaxCaller(CALLER_FUNCTION_APPROVE, maxApproveAbaxStableArgs)

      // max approve: owner = AbaxCaller, spender = AbaxLendingPool
      const maxApproveAbaxAssetArgs = [ASSETS[asset].address, ABAX_ADDRESS, MAXUINT128]
      await callAbaxCaller(CALLER_FUNCTION_APPROVE, maxApproveAbaxAssetArgs)

      // max approve: owner = AbaxCaller, spender = AndromedaCaller
      const maxApproveAndromedaArgs = [ASSETS[asset].address, andromedaCallerAddress, MAXUINT128]
      await callAbaxCaller(CALLER_FUNCTION_APPROVE, maxApproveAndromedaArgs)

      // approve for deposit: owner = account, spender = AbaxCaller
      const stableToken = new PSP22(ASSETS[stableAsset].address, account, api)
      const approveDepositArgs = [abaxCallerAddress, depositAmount]
      await callContract(stableToken.nativeContract, TOKEN_FUNCTION_APPROVE, approveDepositArgs)

      // call deposit function in AbaxCaller contract
      const depositArgs = [ASSETS[stableAsset].address, depositAmount, []]
      await callAbaxCaller(CALLER_FUNCTION_DEPOSIT, depositArgs)

      // set deposit as collateral
      const setCollateralArgs = [ASSETS[stableAsset].address, true]
      await callAbax(ABAX_FUNCTION_SET_AS_COLLATERAL, setCollateralArgs)

      // approve for borrow in flash Loan: owner = account, spender = AbaxCaller
      const debtToken = new PSP22(ASSETS[asset].vTokenAddress, account, api)
      const approveBorrowArgs = [abaxCallerAddress, MAXUINT128]
      await callContract(debtToken.nativeContract, TOKEN_FUNCTION_APPROVE, approveBorrowArgs)

      // sec_asset transfer for deposit (needed because we do not swap asset to sec_asset in flash loan yet)
      await callContract(stableToken.nativeContract, TOKEN_FUNCTION_TRANSFER, [
        abaxCallerAddress,
        flashLoanAmount,
        [],
      ])

      // call flash loan function in AbaxCaller contract
      const encodedAccountId = api.createType('AccountId', account.address)
      const encodedMarginType = new Uint8Array([0])
      const encodedAssetId = api.createType('AccountId', ASSETS[stableAsset].address)
      const bytes = Uint8Array.from([
        ...encodedAccountId.toU8a(),
        ...encodedMarginType,
        ...encodedAssetId.toU8a(),
      ])

      const flashLoanArgs = [
        abaxCallerAddress,
        [ASSETS[asset].address],
        [flashLoanAmount],
        u8aToHex(bytes),
      ]

      const gasLimitFactor = 0.96
      await callAbax(ABAX_FUNCTION_FLASH_LOAN, flashLoanArgs, null, gasLimitFactor)

      // view token balance for verification
      const realizedAmount = (await debtToken.query.balanceOf(account.address)).value.unwrap()
        .rawNumber

      console.log(realizedAmount.toNumber())

      //expect(realizedAmount.gte(flashLoanAmount)).toBeTruthy()
      expect(false).toBeTruthy()
    },
    TIMEOUT,
  )
})
