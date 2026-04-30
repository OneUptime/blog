# How to Configure IPv6 for CMTS Equipment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CMTS, Cable, DOCSIS, ISP, DHCPv6

Description: Configure IPv6 on Cable Modem Termination Systems (CMTS) for DOCSIS cable broadband subscribers including DHCPv6, prefix delegation, and CPE configuration.

## DOCSIS IPv6 Overview

DOCSIS 3.0+ supports native IPv6 for cable subscribers. The IPv6 provisioning flow:

1. Cable modem powers on and requests IPv6 provisioning via DHCPv6
2. CMTS relays DHCPv6 to provisioning server
3. Cable modem gets an IPv6 address and provisioning parameters, then retrieves its config file from TFTP
4. CPE router gets a delegated prefix via DHCPv6-PD
5. Home devices typically get addresses via SLAAC from the CPE

## Cisco CMTS: IPv6 Configuration

```text
! Cisco uBR or cBR-8 CMTS - IPv6 configuration

ipv6 unicast-routing

! Configure the subscriber bundle for IPv6
interface Bundle1
  ipv6 address 2001:db8:100::1/64
  ipv6 enable
  ipv6 nd managed-config-flag
  ipv6 nd other-config-flag
  ipv6 nd ra interval 30

! DHCPv6 relay for cable subscribers
  ipv6 dhcp relay destination 2001:db8:ffff::10

! Associate the cable MAC domain with the IPv6-enabled bundle
interface Cable1/0/1
  cable ip-init ipv6
  cable bundle 1

! Verify IPv6 cable modem and prefix assignments
show cable modem ipv6
show cable modem ipv6 prefix
show cable modem ipv6 summary
```

## ISC Kea DHCPv6 for CMTS

```json
{
    "Dhcp6": {
        "interfaces-config": {
            "interfaces": ["eth0"]
        },
        "subnet6": [
            {
                "id": 1,
                "subnet": "2001:db8:100::/48",
                "relay": {
                    "ip-addresses": ["2001:db8:100::1"]
                },
                "pools": [
                    {"pool": "2001:db8:100::10 - 2001:db8:100::ffff"}
                ],
                "pd-pools": [
                    {
                        "prefix": "2001:db8:2000::",
                        "prefix-len": 40,
                        "delegated-len": 56
                    }
                ]
            }
        ]
    }
}
```

## Monitoring Cable IPv6 Subscribers

```text
# Registered IPv6 cable modems
show cable modem ipv6 registered

# Delegated IPv6 prefixes visible on the CMTS
show cable modem ipv6 prefix

# IPv6 subscriber summary by cable interface
show cable modem ipv6 summary
```

## Conclusion

CMTS IPv6 configuration for DOCSIS networks requires enabling IPv6 on cable bundle interfaces, configuring DHCPv6 relay to forward subscriber DHCPv6 requests to the provisioning server, and allocating delegated prefixes for home network routing. Cisco CMTS platforms use bundle-interface IPv6 configuration together with cable-interface provisioning commands such as `cable ip-init` and `cable bundle`. Monitor IPv6 subscriber state with `show cable modem ipv6`, `show cable modem ipv6 prefix`, and `show cable modem ipv6 summary` to catch provisioning issues early.
