import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { BN } from 'bn.js'
import { ASSETS } from '../../data/assets'
import { address } from '../../deployments/addresses/andromedacaller/development'
import AndromedaTradingPair from '../../typed_contracts/contracts/andromeda_psp22_trading_pair'
import AndromedaRouter from '../../typed_contracts/contracts/andromeda_router'
import AndromedaCaller from '../../typed_contracts/contracts/andromedacaller'
import PSP22 from '../../typed_contracts/contracts/psp22'
import { contractTx } from '../helpers'

const TIMEOUT = 60000
const ENDPOINT = 'ws://localhost:9944'

const ANDROMEDA_ROUTER_ADDRESS = '5ErbVfJHQSnFL9cERSP73v2EaaBJCxW16VuZiX4qv63KWS1T'

const CALLER_FUNCTION_CREATE_PSP22_LIQUIDITY_POOL = 'create_psp22_liquidity_pool'
const CALLER_FUNCTION_SWAP_PSP22_TOKENS = 'swap_psp22_tokens'

const TOKEN_FUNCTION_APPROVE = 'PSP22::approve'

describe('Andromedacaller contract interactions', () => {
  let api: ApiPromise
  let account: KeyringPair
  let andromedaCaller: AndromedaCaller
  let router: AndromedaRouter
  let callCaller: (functionName: string, args: any[], caller?: KeyringPair) => Promise<any>
  let callContract: (
    contract: ContractPromise,
    functionName: string,
    args: any[],
    caller?: KeyringPair,
  ) => Promise<any>

  beforeAll(async () => {
    const provider = new WsProvider(ENDPOINT)
    api = await ApiPromise.create({ provider })
    account = new Keyring({ type: 'sr25519' }).addFromUri('//Alice', { name: 'Alice' })
    andromedaCaller = new AndromedaCaller(address, account, api)
    router = new AndromedaRouter(ANDROMEDA_ROUTER_ADDRESS, account, api)

    callContract = async (
      contract: ContractPromise,
      functionName: string,
      args: any[],
      caller: KeyringPair,
    ) => {
      await contractTx(api, caller ?? account, contract, functionName, args).catch((error) => {
        console.error(functionName, error)
      })
    }

    callCaller = async (functionName: string, args: any[], caller?: KeyringPair) =>
      await callContract(andromedaCaller.nativeContract, functionName, args, caller)
  })

  afterAll(async () => {
    api.disconnect()
  })

  test(
    'Contract function call create psps22 liquidity pool',
    async () => {
      const assetA = 'BTC'
      const assetB = 'USDC'
      const depositAmount = {
        [assetA]: new BN(1).mul(new BN(10).pow(new BN(ASSETS[assetA].decimals))),
        [assetB]: new BN(40000).mul(new BN(10).pow(new BN(ASSETS[assetB].decimals))),
      }

      // approve tokenA for liquidity deposit: owner = account, spender = AndromedaCaller
      const tokenA = new PSP22(ASSETS[assetA].address, account, api)
      const approveTokenADepositArgs = [address, depositAmount[assetA]]
      await callContract(tokenA.nativeContract, TOKEN_FUNCTION_APPROVE, approveTokenADepositArgs)

      // approve tokenB for liquidity deposit: owner = account, spender = AndromedaCaller
      const tokenB = new PSP22(ASSETS[assetB].address, account, api)
      const approveTokenBDepositArgs = [address, depositAmount[assetB]]
      await callContract(tokenB.nativeContract, TOKEN_FUNCTION_APPROVE, approveTokenBDepositArgs)

      // call create_liquidity_pool function in AndromedaCaller contract
      const createLiquidityPoolArgs = [
        ASSETS[assetA].address,
        ASSETS[assetB].address,
        depositAmount[assetA],
        depositAmount[assetB],
      ]
      await callCaller(CALLER_FUNCTION_CREATE_PSP22_LIQUIDITY_POOL, createLiquidityPoolArgs)

      // get created pool address
      const poolAddress = (
        await router.query.getAssociatedPsp22Pool(ASSETS[assetA].address, ASSETS[assetB].address)
      ).value.unwrap()

      // get pool balances
      const pool = new AndromedaTradingPair(poolAddress.toString(), account, api)
      const poolBalances = (await pool.query.getTokenBalances()).value.unwrap()

      // get collateral token balance
      const realizedCollateral = (await pool.query.balanceOf(account.address)).value.unwrap()
        .rawNumber

      const realizedDepositAssetA = poolBalances[0].rawNumber
      const realizedDepositAssetB = poolBalances[1].rawNumber

      expect(realizedDepositAssetA.toNumber()).toBe(depositAmount[assetA].toNumber())
      expect(realizedDepositAssetB.toNumber()).toBe(depositAmount[assetB].toNumber())
      expect(realizedCollateral.toNumber()).toBeGreaterThan(0)
    },
    TIMEOUT,
  )

  test(
    'Contract function call swap psps22 token',
    async () => {
      const assetA = 'BTC'
      const assetB = 'DAI'

      const tokenA = new PSP22(ASSETS[assetA].address, account, api)
      const tokenB = new PSP22(ASSETS[assetB].address, account, api)

      const balances = {
        [assetA]: (await tokenA.query.balanceOf(account.address)).value.unwrap().rawNumber,
        [assetB]: (await tokenB.query.balanceOf(account.address)).value.unwrap().rawNumber,
      }
      const depositAmount = {
        [assetA]: new BN(1).mul(new BN(10).pow(new BN(ASSETS[assetA].decimals))),
        [assetB]: new BN(40000).mul(new BN(10).pow(new BN(ASSETS[assetB].decimals))),
      }
      const swapAmountTokenB = new BN(200).mul(new BN(10).pow(new BN(ASSETS[assetB].decimals)))

      // approve tokenA for liquidity deposit: owner = account, spender = AndromedaCaller
      const approveTokenADepositArgs = [address, depositAmount[assetA]]
      await callContract(tokenA.nativeContract, TOKEN_FUNCTION_APPROVE, approveTokenADepositArgs)

      // approve tokenB for liquidity deposit: owner = account, spender = AndromedaCaller
      const approveTokenBDepositArgs = [address, depositAmount[assetB]]
      await callContract(tokenB.nativeContract, TOKEN_FUNCTION_APPROVE, approveTokenBDepositArgs)

      // call create_liquidity_pool function in AndromedaCaller contract
      const createLiquidityPoolArgs = [
        ASSETS[assetA].address,
        ASSETS[assetB].address,
        depositAmount[assetA],
        depositAmount[assetB],
      ]
      await callCaller(CALLER_FUNCTION_CREATE_PSP22_LIQUIDITY_POOL, createLiquidityPoolArgs)

      // get created pool address
      const poolAddress = (
        await router.query.getAssociatedPsp22Pool(ASSETS[assetA].address, ASSETS[assetB].address)
      ).value.unwrap()

      // get expected tokenA swap out amount
      const tradingPair = new AndromedaTradingPair(poolAddress.toString(), account, api)
      const expectedTokenAOutAmount = (
        await tradingPair.query.getPsp22AAmountOut(swapAmountTokenB)
      ).value.unwrap().rawNumber

      // approve for swap: owner = account, spender = AndromedaCaller
      const approveTokenSwapArgs = [address, swapAmountTokenB]
      await callContract(tokenB.nativeContract, TOKEN_FUNCTION_APPROVE, approveTokenSwapArgs)

      // swap tokenB for tokenA
      const slippage = 1
      const swapArgs = [ASSETS[assetB].address, ASSETS[assetA].address, swapAmountTokenB, slippage]
      await callCaller(CALLER_FUNCTION_SWAP_PSP22_TOKENS, swapArgs)

      // view tokenA balance for verification
      const newTokenABalance = (await tokenA.query.balanceOf(account.address)).value.unwrap()
        .rawNumber

      // view tokenB balance for verification
      const newTokenBBalance = (await tokenB.query.balanceOf(account.address)).value.unwrap()
        .rawNumber

      const minTokenAOutAmount = expectedTokenAOutAmount
        .mul(new BN(100 - slippage))
        .div(new BN(100))

      expect(newTokenBBalance.toNumber()).toBe(
        balances[assetB].sub(depositAmount[assetB]).sub(swapAmountTokenB).toNumber(),
      )

      const expectedTokenABalance = balances[assetA]
        .sub(depositAmount[assetA])
        .add(minTokenAOutAmount)
      expect(newTokenABalance.toNumber()).toBeGreaterThan(expectedTokenABalance.toNumber())
    },
    TIMEOUT,
  )
})
