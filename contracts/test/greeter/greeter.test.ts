import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { Keyring } from '@polkadot/keyring'
import type { WeightV2 } from '@polkadot/types/interfaces'
import { IKeyringPair } from '@polkadot/types/types'
import { BN, BN_ONE, stringCamelCase } from '@polkadot/util'
import { address } from '../../deployments/greeter/development'
import abiPath from '../../deployments/greeter/greeter.json'

const ENDPOINT = 'ws://localhost:9944'
const SET_MESSAGE_FUNCTION = 'set_message'
const GREET_FUNCTION = 'greet'
const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE)
const PROOFSIZE = new BN(1_000_000)

describe('Contract Interaction', () => {
  let api
  let alice
  let contract

  beforeAll(async () => {
    const provider = new WsProvider(ENDPOINT)
    api = await ApiPromise.create({ provider })
    await api.isReady
    const keyring = new Keyring({ type: 'sr25519' })
    alice = keyring.addFromUri('//Alice', { name: 'Alice' })
    contract = new ContractPromise(api, abiPath, address)
  })

  afterAll(() => {
    api.disconnect()
  })

  test('Contract function query greet', async () => {
    const { gasRequired, storageDeposit, result, output } = await queryContract(
      api,
      contract,
      GREET_FUNCTION,
      alice.address,
    )

    const parsed_output = JSON.parse(output)

    expect(result.isOk).toBe(true)
    expect(parsed_output['ok']).toBe('Hello ink!')
  })

  test('Contract function call set_message', async () => {
    const newValue = 'newValue'

    await callContract(api, contract, SET_MESSAGE_FUNCTION, alice, [newValue])
      .then((result) => {
        console.log('Transaction finalized:', result)
      })
      .catch((error) => {
        console.error('Error:', error)
      })

    const { gasRequired, storageDeposit, result, output } = await queryContract(
      api,
      contract,
      GREET_FUNCTION,
      alice.address,
    )

    const parsed_output = JSON.parse(output)

    expect(result.isOk).toBe(true)
    expect(parsed_output['ok']).toBe(newValue)
  })
})

const queryContract = async (
  api,
  contract,
  functionName: string,
  fromAddress: string,
  args: any[] = [],
) => {
  const storageDepositLimit = null

  const queryFn = contract.query[stringCamelCase(functionName)]
  const { gasRequired, storageDeposit, result, output } = await queryFn(
    fromAddress,
    {
      gasLimit: api?.registry.createType('WeightV2', {
        refTime: MAX_CALL_WEIGHT,
        proofSize: PROOFSIZE,
      }) as WeightV2,
      storageDepositLimit,
    },
    ...args,
  )

  console.log(result.toHuman())

  if (result.isOk) {
    console.log('Success', output.toHuman())
  } else {
    console.error('Error', result.asErr)
  }

  return { gasRequired, storageDeposit, result, output }
}

export const callContract = (
  api,
  contract,
  functionName: string,
  account: IKeyringPair,
  args = [] as unknown[],
) => {
  return new Promise((resolve, reject) => {
    queryContract(api, contract, functionName, account.address, args)
      .then(({ gasRequired, storageDeposit, result, output }) => {
        if (!result.isOk) {
          reject({
            output,
            errorMessage: result.asErr || 'Error',
          })
          return
        }

        const gasLimit = gasRequired
        const tx = contract.tx[stringCamelCase(functionName)]({ gasLimit }, ...args)

        tx.signAndSend(account, (result) => {
          if (result.status.isInBlock) {
            console.log('Transaction in block')
          } else if (result.status.isFinalized) {
            console.log('Transaction finalized')
            resolve(result)
          }
        })
      })
      .catch(reject)
  })
}
