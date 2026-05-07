# Validation Summary: How to Configure Asterisk PBX with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Asterisk
- `res_pjsip` / `chan_pjsip`
- `chan_sip`
- SIP
- IPv6
- Asterisk dialplan (`extensions.conf`)
- Linux firewalling with `ip6tables`

## Sources Consulted
- Asterisk Documentation: IPv6 Support  
  https://docs.asterisk.org/Deployment/IPv6-Support/
- Asterisk Documentation: Configuring `res_pjsip` for IPv6  
  https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/Configuring-res_pjsip-for-IPv6/
- Asterisk Documentation: PJSIP Transport Selection  
  https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/PJSIP-Transport-Selection/
- Asterisk Documentation: `chan_sip` overview and removal notice  
  https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-chan_sip/
- Asterisk Documentation: Configuring `chan_sip` for IPv6  
  https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-chan_sip/Configuring-chan_sip-for-IPv6/
- Asterisk Documentation: `res_pjsip` module configuration reference  
  https://docs.asterisk.org/Asterisk_20_Documentation/API_Documentation/Module_Configuration/res_pjsip/
- Asterisk Documentation: IP Quality of Service  
  https://docs.asterisk.org/Configuration/Channel-Drivers/IP-Quality-of-Service/
- Official Asterisk sample config: `pjsip.conf.sample`  
  https://raw.githubusercontent.com/asterisk/asterisk/master/configs/samples/pjsip.conf.sample
- Official Asterisk sample config: `rtp.conf.sample`  
  https://raw.githubusercontent.com/asterisk/asterisk/master/configs/samples/rtp.conf.sample
- Official Asterisk 20 sample config: `sip.conf.sample`  
  https://raw.githubusercontent.com/asterisk/asterisk/20/configs/samples/sip.conf.sample

## Issues Found
- The PJSIP endpoint referenced `aors=1001`, but the defined AOR section was `[1001-aor]`. I corrected the endpoint to `aors=1001-aor` so the configuration is internally consistent.
- The dialplan referenced a PJSIP trunk named `sip-trunk-ipv6`, but no corresponding PJSIP trunk configuration existed. I added a minimal IPv6 PJSIP trunk example with `endpoint`, `aor`, and `identify` sections so the dialplan example matches the configuration shown.
- The `chan_sip` example implied current support, but official Asterisk documentation says `chan_sip` was deprecated in Asterisk 17 and removed in Asterisk 21. I updated the text to scope that section to Asterisk 20 and earlier.
- The `chan_sip` example used `ipv6=yes`, which is not documented in the official `sip.conf.sample` for Asterisk 20. I removed it and used the documented IPv6 bind syntax instead: `bindaddr=[::]:5060`.
- The trunk placeholders `2001:db8::sip-trunk` and `2001:db8::asterisk` were not valid IPv6 literals. I replaced them with syntactically valid documentation addresses from `2001:db8::/32`.
- The `rtp.conf` example used `bindaddr`, `tos`, and `cos` settings that are not documented in the official `rtp.conf.sample`. I removed those incorrect lines and kept the valid RTP port-range settings.
- The final explanation suggested `bind=::` as the basis for dual-stack behavior in PJSIP. Official transport-selection guidance warns against relying on a single wildcard IPv6 transport for both families. I clarified that separate IPv4 and IPv6 transport objects are the correct approach when both address families are needed.
- The dialplan block was tagged as `javascript` even though it is Asterisk dialplan/config syntax. I corrected the code fence to `ini`.

## Review Notes
- The dedicated Asterisk IPv6 guide for `res_pjsip` says no separate RTP IPv6 bind configuration is required; RTP address family selection follows the signaling address family.
- The firewall persistence command shown is distribution-specific. The `ip6tables` rules themselves are valid, but persisting them may differ across Linux distributions.
- The `g729` codec in the PJSIP example may require additional codec support depending on how Asterisk is built and licensed in the deployment.
