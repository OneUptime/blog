# Validation Summary: How to Configure QoS Policies for IPv4 on a Cisco Router

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- Modular QoS CLI (MQC)
- Cisco NBAR protocol classification
- CBWFQ / LLQ policy maps
- DSCP marking for IPv4 traffic

## Sources Consulted
- Cisco IOS Quality of Service Solutions Command Reference, `match protocol` / `match protocol rtp`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos/command/qos-cr-book/qos-m1.html
- Classifying Network Traffic Using NBAR in Cisco IOS XE Software: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_nbar/configuration/xe-3s/Classifying_Network_Traffic_Using_NBAR_in_Cisco_IOS_XE_Software.html
- QoS: Congestion Management Configuration Guide, Cisco IOS XE 17, Low Latency Queueing with Priority Percentage Support: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_conmgt/configuration/xe-17/qos-conmgt-xe-17-book/qos-conmgt-llq-pps.html
- Ascertain Bandwidth and Priority Commands of a QoS Service Policy: https://www.cisco.com/c/en/us/support/docs/quality-of-service-qos/qos-packet-marking/10100-priorityvsbw.html
- Cisco IOS Interface Command Reference, `max-reserved-bandwidth`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/interface/command/ir-cr-book/ir-l2.pdf
- Quality of Service Configuration Guide, Cisco IOS XE 17.x, QoS Packet Policing: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/qos/b-quality-of-service/m_qos-policing.html
- `show policy-map interface` command syntax reference: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst4500/XE3-11-0E/command/reference/xe-311-cmd/show1.html

## Issues Found
- The post used `match protocol https`, but Cisco NBAR identifies HTTPS as `secure-http`. I changed the class map to `match protocol secure-http` so the example matches Cisco’s documented protocol syntax.
- The inbound policing example used `police rate 50000000 bps`, which is the control-plane policing form, not the normal MQC interface policer syntax used in a policy-map class. I changed it to `police cir 50000000`.
- The outbound policy allocated 30% + 40% + 10% + 20% = 100% of interface bandwidth. Cisco’s default maximum reservable bandwidth is 75%, so the example can fail to attach unless the interface is adjusted. I added `max-reserved-bandwidth 100` under the WAN interface to make the example work as written.
- The explanation under `priority percent 30` described the bandwidth as "reserved exclusively," which is misleading. Cisco documents `priority` and `bandwidth` as guarantees rather than true exclusive reservations, with unused bandwidth shared by other classes. I corrected that wording.
- The `class-default` explanation said it "gets remaining bandwidth" even though the configuration explicitly gives it `bandwidth percent 20`. I corrected the wording to match the configured behavior.
- The closing sentence described MQC as "vendor-standard," which is imprecise. I changed it to a technically accurate description of MQC as a consistent Cisco IOS approach across platforms.

## Review Notes
- NBAR protocol support varies by platform and software release. On older IOS or platform-specific images, check router CLI help to confirm protocol availability.
- If the WAN service rate is lower than the physical interface speed, a shaping policy to the provider rate is usually needed; otherwise percentage-based QoS operates against the interface bandwidth, not the contracted bottleneck.
