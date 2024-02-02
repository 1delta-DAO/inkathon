import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { Keyring } from '@polkadot/keyring'
import type { WeightV2 } from '@polkadot/types/interfaces'
import { IKeyringPair } from '@polkadot/types/types'
import { BN, BN_ONE, stringCamelCase } from '@polkadot/util'
import { address } from '../../deployments/addresses/greeter/development'
import abiPath from '../../deployments/files/greeter/greeter.json'

const ENDPOINT = process.env.LOCAL_ENDPOINT
const SET_MESSAGE_FUNCTION = 'set_message'
const GREET_FUNCTION = 'greet'
const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE)
const PROOFSIZE = new BN(1_000_000)

describe('Greeter contract interactions', () => {
  let api
  let alice
  let contract

  beforeAll(async () => {
    const provider = new WsProvider(ENDPOINT)
    api = await ApiPromise.create({ provider })
    await api.isReady
    const keyring = new Keyring({ type: 'sr25519' })
    //alice = keyring.addFromUri('//Alice', { name: 'Alice' })
    alice = keyring.addFromUri('//Bob', { name: 'Bob' })
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

    await callContract(api, contract, SET_MESSAGE_FUNCTION, alice, [newValue]).catch((error) => {
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

  test('Contract function batch call set_message', async () => {
    const newValue = 'bla'

    await batchAllCall(api, contract, SET_MESSAGE_FUNCTION, alice, [newValue]).catch((error) => {
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
    expect(parsed_output['ok']).toBe("newValue2")
  }, 60000)
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

  if (!result.isOk) {
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
          if (result.status.isFinalized) {
            resolve(result)
          }
        })
      })
      .catch(reject)
  })
}

export const batchCall = (
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
        const txs = [
          api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000),
          contract.tx[stringCamelCase(functionName)]({ gasLimit }, ...args),
          contract.tx[stringCamelCase(functionName)]({ gasLimit }, ...["test"]),
          contract.tx[stringCamelCase(functionName)]({ gasLimit }, ...args),
          contract.tx[stringCamelCase(functionName)]({ gasLimit }, 2),
          api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000),
          api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000),
          api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000),
          api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000),
        ];
    
        api.tx.utility
          .batch(txs)
          .signAndSend(account, ({ status }) => {
            if (status.isFinalized) {
              resolve(result)
            }
          });
      })
      .catch(reject)
  })
}

export const batchCall100 = (
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
        const txs = []
        for (let i = 0; i < 160; i++) {
          const tx = contract.tx[stringCamelCase(functionName)]({ gasLimit }, ...args)
          txs.push(tx)
        }
    
        api.tx.utility
          .batch(txs)
          .signAndSend(account, ({ status }) => {
            if (status.isFinalized) {
              resolve(result)
            }
          });
      })
      .catch(reject)
  })
}



export const batchAllCall = (
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
        const txs = []
        for (let i = 0; i < 160; i++) {
          const tx = contract.tx[stringCamelCase(functionName)]({ gasLimit }, ...args)
          txs.push(tx)
        }

        txs.push(api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000))
        txs.push(api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000))
        txs.push(api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000))
        txs.push(api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000))
        txs.push(api.tx.balances.transfer("5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV", 10_000_000_000_000))

        api.tx.utility
          .batchAll(txs)
          .signAndSend(account, ({ status }) => {
            if (status.isFinalized) {
              resolve(result)
            }
          });
      })
      .catch(reject)
  })
}
