# Validation Summary: How to Implement Low-Power IoT Protocols

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MicroPython
- LoRaWAN / LoRa radios
- Bluetooth Low Energy (BLE) GATT peripherals
- Zigbee / IEEE 802.15.4
- NB-IoT and LTE-M
- Battery-life estimation and duty cycling

## Sources Consulted
- MicroPython `machine` module documentation: https://docs.micropython.org/en/latest/library/machine.html
- MicroPython `bluetooth` module documentation: https://docs.micropython.org/en/latest/library/bluetooth.html
- MicroPython `RTC` class documentation: https://docs.micropython.org/en/latest/library/machine.RTC.html
- LoRaWAN Link Layer Specification v1.0.4, LoRa Alliance: https://lora-alliance.org/wp-content/uploads/2021/11/LoRaWAN-Link-Layer-Specification-v1.0.4.pdf
- LoRaWAN Regional Parameters v1.0.3, LoRa Alliance: https://lora-alliance.org/wp-content/uploads/2020/11/lorawan_regional_parameters_v1.0.3reva_0.pdf
- The Things Network LoRaWAN device activation documentation: https://www.thethingsnetwork.org/docs/lorawan/end-device-activation/
- Bluetooth Environmental Sensing Service specification page: https://www.bluetooth.com/specifications/specs/environmental-sensing-service-1-0/
- Bluetooth 5 feature overview, Bluetooth SIG: https://www.bluetooth.com/wp-content/uploads/2019/03/Bluetooth_5-FINAL.pdf
- Silicon Labs Zigbee fundamentals documentation: https://docs.silabs.com/zigbee/latest/zigbee-fundamentals/01-overview
- ITU / 3GPP IoT standards overview for NB-IoT peak data-rate context: https://www.itu.int/en/ITU-D/Regional-Presence/AsiaPacific/Documents/Events/2018/IoT-BDG/7.%20IoT%20Standards%20Part%20II%20-%20Sami%20Tabbane.pdf

## Issues Found
- The LoRaWAN example implied that raw SX127x packet writes were a complete LoRaWAN implementation. I changed the comments to identify it as a radio power-management skeleton and added explicit `NotImplementedError` methods for MIC calculation, payload encryption, and join-accept handling because production LoRaWAN requires a MAC stack for those functions.
- The LoRa radio mode register values used FSK sleep/standby/TX values (`0x00`, `0x01`, `0x03`) instead of preserving LoRa mode. I changed them to `0x80`, `0x81`, and `0x83`.
- The LoRa FIFO setup wrote `0x00` into the FIFO instead of setting the FIFO address pointer. I changed it to write `0x00` to register `0x0D` before loading the FIFO.
- The LoRaWAN OTAA `DevNonce` was generated randomly. For LoRaWAN 1.0.4, `DevNonce` is a counter, so I changed the example to use an incrementing nonce and noted that it must be persisted in production.
- The LoRaWAN duty-cycle example passed microseconds to `machine.deepsleep()`. MicroPython documents `deepsleep()` timeouts in milliseconds, so I changed the calculation and comment to milliseconds.
- The BLE example used short UUID strings such as `"181A"` with `bluetooth.UUID()`. MicroPython accepts 16-bit integers, byte buffers, or full 128-bit UUID strings, so I changed the Bluetooth SIG 16-bit UUIDs to integer values like `0x181A`.
- The BLE low-power loop used `time.sleep()` while describing light sleep. I changed it to `machine.lightsleep(update_interval * 1000)` and added a hardware/port caveat for BLE retention.
- The power manager configured an RTC alarm using an API that is not part of the current generic MicroPython `RTC` documentation and is unnecessary for timer-based `deepsleep(ms)`. I removed that call and used the documented `deepsleep()` timeout directly.
- The wake-reason mapping used hard-coded numeric values. I changed it to use MicroPython constants such as `RTC_WAKE` and `PIN_WAKE` where available.
- The duty-cycle scheduler used deep sleep while keeping task state only in RAM. MicroPython deep sleep resumes from the main script rather than continuing the loop, so I changed the scheduler to use light sleep.

## Review Notes
- The protocol comparison table is broadly correct as a high-level guide, but actual range, throughput, and power draw vary heavily by region, PHY, data rate, antenna design, network configuration, and carrier settings.
- The LoRaWAN section is now technically framed as a low-level radio/power skeleton. A production implementation should use a maintained LoRaWAN stack or modem firmware rather than implementing MAC cryptography, join handling, regional channels, and duty-cycle compliance ad hoc.
