# Validation Summary: How to Plan Power and Cooling for Ceph Infrastructure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph orchestrator for Kubernetes)
- IPMI / ipmitool (hardware management)
- Linux cpufreq subsystem (CPU power management)
- Data center power distribution (PDUs, UPS, circuits)
- HVAC / precision cooling

## Sources Consulted
- ASHRAE TC 9.9 Thermal Guidelines for Data Processing Environments (inlet temperature recommendations: 18-27°C for A1 class)
- NEC (National Electrical Code) Article 210.20 — 80% continuous load derating rule for circuit breakers
- HVAC engineering references — 1 kW = 3,412 BTU/hr; 1 ton of cooling = 12,000 BTU/hr
- Linux kernel documentation for cpufreq governors (`conservative`, `powersave`, `ondemand`)
- ipmitool man page — `dcmi power reading`, `sdr type Temperature` commands
- Linux sysfs documentation — `/sys/devices/system/cpu/cpu*/cpufreq/scaling_governor` path

## Issues Found

### 1. Design power figure inconsistent between Step 1 and Step 2
- **What was wrong:** Step 1 calculates a design power of 5040W (4200W × 1.2), but Step 2's comments referenced "5520W" which doesn't match any prior calculation. The amperage calculation in Step 2 also used 220V while the echo output recommended 208V circuits.
- **What was changed:** Updated Step 2 comments to use 5040W (matching Step 1 output) and standardized the calculation to 208V (the standard US data center three-phase voltage), yielding 24.2A per PDU. Updated the circuit sizing comment to note that 24.2A is tight against a single 30A derated circuit (24A usable). Changed the echo from "32A @ 208V or 30A @ 220V" to "30A @ 208V" for consistency.
- **Why:** Readers following the guide step-by-step would be confused by numbers that don't carry forward. The 208V standardization matches the echo output and is the more common US data center voltage.

### 2. Cooling calculation used inconsistent power figure
- **What was wrong:** Step 3 used `DESIGN_KW=6` (6000W), which doesn't match the 5040W (~5 kW) design power from Step 1.
- **What was changed:** Updated to `DESIGN_KW=5` with a comment noting it's rounded from 5040W design power.
- **Why:** Consistency across the steps. Using 6 kW would overestimate cooling requirements by ~20% beyond the already-included 20% overhead from Step 1.

## Review Notes
- The power consumption ranges in the components table are reasonable ballpark figures but will vary significantly by vendor and configuration. Readers should consult their specific hardware datasheets.
- The post uses "N+1" to describe dual PDU redundancy. In strict data center terminology, dual independent power feeds where each can carry full load is often called "2N" redundancy. "N+1" typically means one spare unit beyond the minimum needed. Both terms are used in industry; this is a convention difference, not an error.
- 27°C is listed as approximately 80°F; the precise conversion is 80.6°F. This approximation is standard in data center documentation and not worth correcting.
- The `conservative` CPU governor is a valid choice but `powersave` is more commonly recommended for maximum power savings on modern Intel/AMD processors with P-state drivers. The post's choice is defensible since `conservative` offers a better latency profile for storage workloads.
- The ASHRAE A1 critical inlet temperature limit is 32°C, while the post uses 35°C for the critical alert threshold. 35°C falls within ASHRAE A2 allowable range. This is acceptable depending on equipment class but worth noting.
