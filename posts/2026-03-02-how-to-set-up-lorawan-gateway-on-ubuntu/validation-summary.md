# Validation Summary: How to Set Up LoRaWAN Gateway on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LoRaWAN (Long Range Wide Area Network)
- ChirpStack v4 (open-source LoRaWAN network server)
- ChirpStack Gateway Bridge
- ChirpStack Concentratord
- PostgreSQL
- Redis
- Mosquitto (MQTT broker)
- Ubuntu 20.04 / 22.04
- Semtech UDP Packet Forwarder protocol
- Paho MQTT Python client
- RTL-SDR / RAK2245 Pi HAT hardware
- JavaScript payload codecs (decodeUplink signature)

## Sources Consulted
- ChirpStack Debian/Ubuntu install docs: https://www.chirpstack.io/docs/getting-started/debian-ubuntu.html
- ChirpStack Gateway Bridge configuration docs: https://www.chirpstack.io/docs/chirpstack-gateway-bridge/configuration.html
- RAK Wireless RAK2245 Pi HAT product information (concentrator chipset)
- LoRaWAN regional parameters (RP002 series) and MAC versions

## Issues Found
1. **Incorrect ChirpStack APT repository URLs**: The post referenced `https://artifacts.chirpstack.io/downloads/chirpstack/chirpstack.gpg` for the key and `https://artifacts.chirpstack.io/downloads/chirpstack/apt` for the repo. The official ChirpStack v4 URLs are `https://artifacts.chirpstack.io/packages/chirpstack.key` for the GPG key and `https://artifacts.chirpstack.io/packages/4.x/deb` for the repository. Updated to match official docs.
2. **Wrong PostgreSQL extension**: Post created the `hstore` extension. ChirpStack v4 requires `pg_trgm` (used for search). Updated `CREATE EXTENSION IF NOT EXISTS hstore` to `pg_trgm`.
3. **Invalid Gateway Bridge config field**: The post used `topic_prefix = "eu868/gateway"`, which is not a valid configuration field in ChirpStack Gateway Bridge v4. Replaced with the actual template-based fields: `event_topic_template`, `state_topic_template`, and `command_topic_template` using the `{{ .GatewayID }}`/`{{ .EventType }}` template variables.
4. **Wrong chipset attribution for RAK2245**: The post stated "RAK2245 Pi HAT (SX1302 chipset)" while another sentence in the same section correctly said "SX1301-based hardware like the RAK2245 HAT". The RAK2245 uses the SX1301 chipset (the RAK2287 uses SX1302). Corrected to SX1301.

## Review Notes
- The `apt-transport-https` package is no longer strictly required on modern Ubuntu (it is included by default since 20.04), but installing it is harmless and matches the historical ChirpStack install instructions, so it was left in.
- The `/usr/share/keyrings/` path was replaced with `/etc/apt/keyrings/` to match the current official ChirpStack docs.
- The `secret` field under `[api]` is the JWT signing secret in ChirpStack v4 — the comment in the config is accurate.
- The MQTT subscription topic `application/+/device/+/event/up` matches the ChirpStack v4 default event topic template.
- The JavaScript codec uses the `decodeUplink(input)` signature with `input.bytes`, which is the correct ChirpStack v4 codec signature (aligned with TTN v3).
- The post mentions Ubuntu 20.04 / 22.04 — ChirpStack v4 supports both; Ubuntu 24.04 is also supported in newer releases but is not strictly required for the post to be accurate.
- The default `admin`/`admin` credentials are correct for fresh ChirpStack v4 installs.
