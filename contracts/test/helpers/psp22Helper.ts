import { ApiPromise } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { IKeyringPair } from '@polkadot/types/types'
import psp22AbiPath from '../../deployments/psp22/psp22.json'
import { contractQuery, decodeOutput } from '../helpers'

const TOKEN_FUNCTION_BALANCEOF = 'PSP22::balanceOf'

export const getPsp22Balance = async (
  api: ApiPromise,
  account: IKeyringPair,
  assetAddress: string,
) => {
  const tokenContract = new ContractPromise(api, psp22AbiPath, assetAddress)
  const tokenResult = await contractQuery(
    api,
    account.address,
    tokenContract,
    TOKEN_FUNCTION_BALANCEOF,
    undefined,
    [account.address],
  )

  const tokenResultDecoded = decodeOutput(tokenResult, tokenContract, TOKEN_FUNCTION_BALANCEOF)

  if (tokenResultDecoded.isError) {
    console.error('Error', tokenResultDecoded.output)
  }

  return BigInt(parseInt(tokenResultDecoded.decodedOutput.replace(/,/g, ''), 10))
}
