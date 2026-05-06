# How to Configure BGP Origin Validation for IPv6 on Juniper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, RPKI, IPv6, Juniper, Routing Security

Description: Configure RPKI-based BGP origin validation for IPv6 prefixes on Juniper Junos devices to filter invalid route announcements.

## Overview

Juniper Junos supports RPKI origin validation natively. Routers connect to an RPKI cache (validator) via the RTR protocol and use origin validation states in routing policies.

## Step 1: Configure the RPKI Cache Session

```text
# Junos configuration mode commands to set the RPKI cache server

set routing-options validation group rpki-validator session 2001:db8:100::1
set routing-options validation group rpki-validator session 2001:db8:100::1 port 3323
set routing-options validation group rpki-validator session 2001:db8:100::1 refresh-time 600
set routing-options validation group rpki-validator session 2001:db8:100::1 hold-time 1200
set routing-options validation group rpki-validator session 2001:db8:100::1 record-lifetime 172800
```

Or in curly-brace syntax:

```text
routing-options {
    validation {
        group rpki-validator {
            session 2001:db8:100::1 {
                port 3323;
                refresh-time 600;
                hold-time 1200;
                record-lifetime 172800;
            }
        }
    }
}
```

## Step 2: Verify the Cache Connection

```text
# Check RPKI session status
show validation session

# Expected output:
# Session               State   Flaps  Uptime       #IPv4/IPv6 records
# 2001:db8:100::1       up      0      2d 00:15:43  300000/85000

# Check RV database entries and IPv6 record counts
show validation database detail

# Query a specific IPv6 RV record
show validation database record 2001:db8::/32
```

## Step 3: Create Routing Policies Based on Validation State

```text
policy-options {
    policy-statement RPKI-IMPORT {
        # Prefer valid routes
        term valid {
            from {
                protocol bgp;
                validation-database valid;
            }
            then {
                validation-state valid;
                local-preference 200;
                accept;
            }
        }
        # Accept unknown routes with lower preference
        term not-found {
            from {
                protocol bgp;
                validation-database unknown;
            }
            then {
                local-preference 100;
                accept;
            }
        }
        # Reject invalid routes
        term invalid {
            from {
                protocol bgp;
                validation-database invalid;
            }
            then {
                reject;
            }
        }
        # Default accept
        term default {
            then accept;
        }
    }
}
```

## Step 4: Apply the Policy to BGP Neighbors

```text
protocols {
    bgp {
        group UPSTREAM-IPV6 {
            type external;
            local-as 64496;
            peer-as 65001;

            # Apply RPKI policy on import
            import RPKI-IMPORT;

            neighbor 2001:db8:200::1 {
                family inet6 {
                    unicast;
                }
            }
        }
    }
}
```

## Step 5: Monitor Validation

```text
# Show BGP routes with validation status
show route validation-state valid
show route validation-state invalid
show route validation-state unknown

# Show a specific prefix with validation detail
show route 2001:db8::/32 detail

# Count invalid routes received
show route validation-state invalid | count
```

## Step 6: Configure Tracing for Validation Events

```text
routing-options {
    # Trace RPKI validation events
    validation {
        traceoptions {
            file "rpki-log" size 100m;
            flag state;
            flag update;
        }
    }
}
```

## Best Practices

1. **Start with monitoring mode**: Use `then local-preference` before adding `then reject` to understand the impact
2. **Test with a lab neighbor first**: Apply the policy to a test BGP session
3. **Monitor cache connectivity**: Alert if the RTR session drops and you lose validation data
4. **Use multiple validators**: Configure two RPKI cache servers for redundancy

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor BGP session health and RPKI validator connectivity from your Juniper routers. Configure alerts for RTR session failures.

## Conclusion

Juniper Junos provides native RPKI support with clear validation states in routing policies. Configure your RTR cache sessions, apply validation-based policies, and monitor continuously for a robust BGP origin validation deployment.
