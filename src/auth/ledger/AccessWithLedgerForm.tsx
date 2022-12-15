import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import UsbIcon from "@mui/icons-material/Usb"
import { LedgerKey } from "@terra-money/ledger-station-js"
import BluetoothTransport from "@ledgerhq/hw-transport-web-ble"
import { LEDGER_TRANSPORT_TIMEOUT } from "config/constants"
import { Form, FormError, FormItem, FormWarning } from "components/form"
import { Checkbox, Input, Submit } from "components/form"
import validate from "../scripts/validate"
import useAuth from "../hooks/useAuth"
import { isBleAvailable } from "utils/ledger"
import { wordsFromAddress } from "utils/bech32"

interface Values {
  index: number
  bluetooth: boolean
}

const AccessWithLedgerForm = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { connectLedger } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()

  /* check bluetooth availability */
  const [bleAvailable, setBleAvailable] = useState(false)
  useEffect(() => {
    isBleAvailable().then(setBleAvailable)
  }, [])

  /* form */
  const form = useForm<Values>({
    mode: "onChange",
    defaultValues: { index: 0, bluetooth: false },
  })

  const { register, watch, handleSubmit, formState } = form
  const { errors } = formState
  const { index, bluetooth } = watch()

  const submit = async ({ index, bluetooth }: Values) => {
    setIsLoading(true)
    setError(undefined)

    try {
      const transport = bluetooth
        ? await BluetoothTransport.create(LEDGER_TRANSPORT_TIMEOUT)
        : undefined

      // TODO: might want to use 118 on terra too
      const key330 = await LedgerKey.create({ transport, index })
      const key118 = await LedgerKey.create({ transport, index, coinType: 118 })
      connectLedger(
        {
          "330": wordsFromAddress(key330.accAddress("terra")),
          "118": wordsFromAddress(key118.accAddress("terra")),
        },
        index,
        bluetooth
      )

      navigate("/", { replace: true })
    } catch (error) {
      setError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit(submit)}>
      <section className="center">
        <UsbIcon style={{ fontSize: 56 }} />
        <p>{t("Plug in a Ledger device")}</p>
      </section>

      <FormItem /* do not translate this */
        label="Index"
        error={errors.index?.message}
      >
        <Input
          {...register("index", {
            valueAsNumber: true,
            validate: validate.index,
          })}
        />

        {index !== 0 && <FormWarning>{t("Default index is 0")}</FormWarning>}

        {bleAvailable && (
          <Checkbox {...register("bluetooth")} checked={bluetooth}>
            Use Bluetooth
          </Checkbox>
        )}
      </FormItem>

      {error && <FormError>{error.message}</FormError>}

      <Submit submitting={isLoading}>{t("Connect")}</Submit>
    </Form>
  )
}

export default AccessWithLedgerForm
