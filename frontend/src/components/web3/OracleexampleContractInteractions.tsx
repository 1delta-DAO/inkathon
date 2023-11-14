import { ContractIds } from '@/deployments/deployments'
import { Button, Card, FormControl, FormLabel, Input, Stack } from '@chakra-ui/react'
import {
  contractQuery,
  decodeOutput,
  useInkathon,
  useRegisteredContract,
} from '@scio-labs/use-inkathon'
import { FC, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import 'twin.macro'

type UpdatePriceValue = { asset: string }

export const OracleexampleContractInteractions: FC = () => {
  const { api, activeAccount, activeSigner } = useInkathon()
  const { contract, address: contractAddress } = useRegisteredContract(ContractIds.Oracleexample)
  const [priceMessage, setPriceMessage] = useState<string>()
  const [fetchIsLoading, setFetchIsLoading] = useState<boolean>()
  const { register, reset, handleSubmit } = useForm<UpdatePriceValue>()

  // Fetch price from oracle
  const fetchPrice = async ({ asset }: UpdatePriceValue) => {
    if (!contract || !api) return

    setFetchIsLoading(true)
    try {
      const assetPair = asset + '/USD'
      console.log(assetPair)
      const result = await contractQuery(api, '', contract, 'get', undefined, [assetPair])
      const { output, isError, decodedOutput } = decodeOutput(result, contract, 'get')
      if (isError) throw new Error(decodedOutput)
      const price = String(parseInt(output[1].replaceAll(',', ''), 10) / 10 ** 18)
      setPriceMessage(price)
    } catch (e) {
      console.error(e)
      toast.error('Error while fetching price of asset. Try again…')
      setPriceMessage(undefined)
    } finally {
      setFetchIsLoading(false)
    }
  }

  if (!api) return null

  return (
    <>
      <div tw="flex grow flex-col space-y-4 max-w-[20rem]">
        <h2 tw="text-center font-mono text-gray-400">Oracle Smart Contract</h2>

        {/* Fetched Price */}
        <Card variant="outline" p={4} bgColor="whiteAlpha.100">
          <FormControl>
            <FormLabel>Fetched Price</FormLabel>
            <Input
              placeholder={fetchIsLoading || !contract ? 'Loading…' : priceMessage}
              disabled={true}
            />
          </FormControl>
        </Card>

        {/* Update asset */}
        <Card variant="outline" p={4} bgColor="whiteAlpha.100">
          <form onSubmit={handleSubmit(fetchPrice)}>
            <Stack direction="row" spacing={2} align="end">
              <FormControl>
                <FormLabel>Get Asset Price</FormLabel>
                <Input disabled={fetchIsLoading} {...register('asset')} />
              </FormControl>
              <Button
                type="submit"
                mt={4}
                colorScheme="purple"
                isLoading={fetchIsLoading}
                disabled={fetchIsLoading}
              >
                Submit
              </Button>
            </Stack>
          </form>
        </Card>

        {/* Contract Address */}
        <p tw="text-center font-mono text-xs text-gray-600">
          {contract ? contractAddress : 'Loading…'}
        </p>
      </div>
    </>
  )
}
