import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { Keyring } from '@polkadot/keyring'
import { IKeyringPair } from '@polkadot/types/types'
import { ASSETS } from '../../data/assets'
import { address } from '../../deployments/addresses/andromedacaller/development'
import callerAbiPath from '../../deployments/files/andromedacaller/andromedacaller.json'
import psp22AbiPath from '../../deployments/files/psp22/psp22.json'
import { contractQuery, contractTx, decodeOutput, getPsp22Balance } from '../helpers'
import psp22TradingPairAbiPath from '../metadata/andromeda/psp22_trading_pair.json'
import routerAbiPath from '../metadata/andromeda/router.json'

const TIMEOUT = 60000
const ENDPOINT = 'ws://localhost:9944'

const ANDROMEDA_ROUTER_ADDRESS = '5ErbVfJHQSnFL9cERSP73v2EaaBJCxW16VuZiX4qv63KWS1T'

const CALLER_FUNCTION_CREATE_PSP22_LIQUIDITY_POOL = 'create_psp22_liquidity_pool'
const CALLER_FUNCTION_SWAP_PSP22_TOKENS = 'swap_psp22_tokens'

const ROUTER_FUNCTION_GET_PSP22_POOL = 'get_associated_psp22_pool'

const POOL_FUNCTION_GET_TOKEN_BALANCES = 'get_token_balances'
const POOL_FUNCTION_GET_A_AMOUNT_OUT = 'get_psp22_a_amount_out'

const TOKEN_FUNCTION_APPROVE = 'PSP22::approve'
const TOKEN_FUNCTION_BALANCEOF = 'PSP22::balanceOf'

describe('Andromedacaller contract interactions', () => {
  let api: ApiPromise
  let account: IKeyringPair
  let callerContract: ContractPromise
  let routerContract: ContractPromise

  beforeAll(async () => {
    const provider = new WsProvider(ENDPOINT)
    api = await ApiPromise.create({ provider })
    account = new Keyring({ type: 'sr25519' }).addFromUri('//Alice', { name: 'Alice' })
    callerContract = new ContractPromise(api, callerAbiPath, address)
    routerContract = new ContractPromise(api, routerAbiPath, ANDROMEDA_ROUTER_ADDRESS)
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
        [assetA]: 1n * 10n ** BigInt(ASSETS[assetA].decimals),
        [assetB]: 40000n * 10n ** BigInt(ASSETS[assetB].decimals),
      }

      // approve tokenA for liquidity deposit: owner = account, spender = AndromedaCaller
      const tokenAContract = new ContractPromise(api, psp22AbiPath, ASSETS[assetA].address)
      const approveTokenADepositArgs = [address, depositAmount[assetA]]
      await contractTx(
        api,
        account,
        tokenAContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveTokenADepositArgs,
      )
        .then((result) => {
          console.log('Approve tokenA transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve tokenA transaction error:', error)
        })

      // approve tokenB for liquidity deposit: owner = account, spender = AndromedaCaller
      const tokenBContract = new ContractPromise(api, psp22AbiPath, ASSETS[assetB].address)
      const approveTokenBDepositArgs = [address, depositAmount[assetB]]
      await contractTx(
        api,
        account,
        tokenBContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveTokenBDepositArgs,
      )
        .then((result) => {
          console.log('Approve tokenB transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve tokenB transaction error:', error)
        })

      // call create_liquidity_pool function in AndromedaCaller contract
      const createLiquidityPool = [
        ASSETS[assetA].address,
        ASSETS[assetB].address,
        depositAmount[assetA],
        depositAmount[assetB],
      ]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_CREATE_PSP22_LIQUIDITY_POOL,
        undefined,
        createLiquidityPool,
      )
        .then((result) => {
          console.log('Create pool transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Create pool transaction error:', error)
        })

      // get created pool address
      const getPoolAddressArgs = [ASSETS[assetA].address, ASSETS[assetB].address]
      const getPoolAddressResult = await contractQuery(
        api,
        account.address,
        routerContract,
        ROUTER_FUNCTION_GET_PSP22_POOL,
        undefined,
        getPoolAddressArgs,
      )

      const getPoolAddressDecoded = decodeOutput(
        getPoolAddressResult,
        routerContract,
        ROUTER_FUNCTION_GET_PSP22_POOL,
      )

      if (getPoolAddressDecoded.isError) {
        fail('Error: ' + getPoolAddressDecoded.output)
      }

      // get pool balances
      const poolContract = new ContractPromise(
        api,
        psp22TradingPairAbiPath,
        getPoolAddressDecoded.output,
      )
      const poolBalancesResult = await contractQuery(
        api,
        account.address,
        poolContract,
        POOL_FUNCTION_GET_TOKEN_BALANCES,
        undefined,
        [],
      )

      const poolBalancesDecoded = decodeOutput(
        poolBalancesResult,
        poolContract,
        POOL_FUNCTION_GET_TOKEN_BALANCES,
      )

      if (poolBalancesDecoded.isError) {
        console.error('Error', poolBalancesDecoded.output)
      }

      // get collateral token balance
      const collateralBalanceArgs = [account.address]
      const poolPSP22Contract = new ContractPromise(api, psp22AbiPath, getPoolAddressDecoded.output)

      const collateralBalanceResult = await contractQuery(
        api,
        account.address,
        poolPSP22Contract,
        TOKEN_FUNCTION_BALANCEOF,
        undefined,
        collateralBalanceArgs,
      )

      const collateralBalanceDecoded = decodeOutput(
        collateralBalanceResult,
        poolPSP22Contract,
        TOKEN_FUNCTION_BALANCEOF,
      )

      if (collateralBalanceDecoded.isError) {
        console.error('Error', collateralBalanceDecoded.output)
      }

      const realizedDepositAssetA = BigInt(
        parseInt(poolBalancesDecoded.output[0].replace(/,/g, ''), 10),
      )
      const realizedDepositAssetB = BigInt(
        parseInt(poolBalancesDecoded.output[1].replace(/,/g, ''), 10),
      )
      const realizedCollateral = BigInt(
        parseInt(collateralBalanceDecoded.decodedOutput.replace(/,/g, ''), 10),
      )

      expect(realizedDepositAssetA).toBe(depositAmount[assetA])
      expect(realizedDepositAssetB).toBe(depositAmount[assetB])
      expect(realizedCollateral).toBeGreaterThan(0)
    },
    TIMEOUT,
  )

  test(
    'Contract function call swap psps22 token',
    async () => {
      const assetA = 'WETH'
      const assetB = 'DAI'
      const balances = {
        [assetA]: await getPsp22Balance(api, account, ASSETS[assetA].address),
        [assetB]: await getPsp22Balance(api, account, ASSETS[assetB].address),
      }
      const depositAmount = {
        [assetA]: 10n * 10n ** BigInt(ASSETS[assetA].decimals),
        [assetB]: 20000n * 10n ** BigInt(ASSETS[assetB].decimals),
      }
      const swapAmountTokenB = 200n * 10n ** BigInt(ASSETS[assetB].decimals)

      // approve tokenA for liquidity deposit: owner = account, spender = AndromedaCaller
      const tokenAContract = new ContractPromise(api, psp22AbiPath, ASSETS[assetA].address)
      const approveTokenADepositArgs = [address, depositAmount[assetA]]
      await contractTx(
        api,
        account,
        tokenAContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveTokenADepositArgs,
      )
        .then((result) => {
          console.log('Approve tokenA transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve tokenA transaction error:', error)
        })

      // approve tokenB for liquidity deposit: owner = account, spender = AndromedaCaller
      const tokenBContract = new ContractPromise(api, psp22AbiPath, ASSETS[assetB].address)
      const approveTokenBDepositArgs = [address, depositAmount[assetB]]
      await contractTx(
        api,
        account,
        tokenBContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveTokenBDepositArgs,
      )
        .then((result) => {
          console.log('Approve tokenB transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve tokenB transaction error:', error)
        })

      // call create_liquidity_pool function in AndromedaCaller contract
      const createLiquidityPoolArgs = [
        ASSETS[assetA].address,
        ASSETS[assetB].address,
        depositAmount[assetA],
        depositAmount[assetB],
      ]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_CREATE_PSP22_LIQUIDITY_POOL,
        undefined,
        createLiquidityPoolArgs,
      )
        .then((result) => {
          console.log('Create pool transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Create pool transaction error:', error)
        })

      // get created pool address
      const getPoolAddressArgs = [ASSETS[assetA].address, ASSETS[assetB].address]
      const getPoolAddressResult = await contractQuery(
        api,
        account.address,
        routerContract,
        ROUTER_FUNCTION_GET_PSP22_POOL,
        undefined,
        getPoolAddressArgs,
      )

      const getPoolAddressResultDecoded = decodeOutput(
        getPoolAddressResult,
        routerContract,
        ROUTER_FUNCTION_GET_PSP22_POOL,
      )

      if (getPoolAddressResultDecoded.isError) {
        fail('Error: ' + getPoolAddressResultDecoded.output)
      }

      // get expected tokenA swap out amount
      const poolContract = new ContractPromise(
        api,
        psp22TradingPairAbiPath,
        getPoolAddressResultDecoded.output,
      )
      const poolGetOutAmountArgs = [swapAmountTokenB]
      const poolGetOutAmountResult = await contractQuery(
        api,
        account.address,
        poolContract,
        POOL_FUNCTION_GET_A_AMOUNT_OUT,
        undefined,
        poolGetOutAmountArgs,
      )

      const poolGetOutAmountDecoded = decodeOutput(
        poolGetOutAmountResult,
        poolContract,
        POOL_FUNCTION_GET_A_AMOUNT_OUT,
      )

      if (poolGetOutAmountDecoded.isError) {
        console.error('Error', poolGetOutAmountDecoded.output)
      }

      // approve for swap: owner = account, spender = AndromedaCaller
      const approveTokenSwapArgs = [address, swapAmountTokenB]
      await contractTx(
        api,
        account,
        tokenBContract,
        TOKEN_FUNCTION_APPROVE,
        undefined,
        approveTokenSwapArgs,
      )
        .then((result) => {
          console.log('Approve token for swap transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Approve token for swap transaction error:', error)
        })

      // swap tokenB for tokenA
      const slippage = 1n
      const swapArgs = [ASSETS[assetB].address, ASSETS[assetA].address, swapAmountTokenB, slippage]
      await contractTx(
        api,
        account,
        callerContract,
        CALLER_FUNCTION_SWAP_PSP22_TOKENS,
        undefined,
        swapArgs,
      )
        .then((result) => {
          console.log('Swap transaction finalized:', result.extrinsicHash)
        })
        .catch((error) => {
          console.error('Swap transaction error:', error)
        })

      // view tokenA balance for verification
      const tokenABalanceArgs = [account.address]
      const tokenABalanceResult = await contractQuery(
        api,
        account.address,
        tokenAContract,
        TOKEN_FUNCTION_BALANCEOF,
        undefined,
        tokenABalanceArgs,
      )

      const tokenABalanceDecoded = decodeOutput(
        tokenABalanceResult,
        tokenAContract,
        TOKEN_FUNCTION_BALANCEOF,
      )

      if (tokenABalanceDecoded.isError) {
        console.error('Error', tokenABalanceDecoded.output)
      }

      // view tokenB balance for verification
      const tokenBBalanceArgs = [account.address]
      const tokenBBalanceResult = await contractQuery(
        api,
        account.address,
        tokenBContract,
        TOKEN_FUNCTION_BALANCEOF,
        undefined,
        tokenBBalanceArgs,
      )

      const tokenBBalanceDecoded = decodeOutput(
        tokenBBalanceResult,
        tokenBContract,
        TOKEN_FUNCTION_BALANCEOF,
      )

      if (tokenBBalanceDecoded.isError) {
        console.error('Error', tokenBBalanceDecoded.output)
      }

      const newTokenABalance = BigInt(
        parseInt(tokenABalanceDecoded.decodedOutput.replace(/,/g, ''), 10),
      )
      const newTokenBBalance = BigInt(
        parseInt(tokenBBalanceDecoded.decodedOutput.replace(/,/g, ''), 10),
      )
      const expectedTokenAOutAmount = BigInt(
        parseInt(poolGetOutAmountDecoded.decodedOutput.replace(/,/g, ''), 10),
      )

      const minTokenAOutAmount = (expectedTokenAOutAmount * (100n - slippage)) / 100n

      expect(newTokenBBalance).toBe(balances[assetB] - depositAmount[assetB] - swapAmountTokenB)
      expect(newTokenABalance).toBeGreaterThanOrEqual(
        balances[assetA] - depositAmount[assetA] + minTokenAOutAmount,
      )
    },
    TIMEOUT,
  )
})
