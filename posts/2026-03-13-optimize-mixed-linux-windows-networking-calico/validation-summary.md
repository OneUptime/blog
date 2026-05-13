# Validation Summary: How to Optimize Mixed Linux and Windows Networking with Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (CNI plugin)
- Calico for Windows
- Kubernetes
- Windows Server 2019/2022
- VXLAN encapsulation
- BGP peering
- PowerShell
- kubectl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico for Windows limitations: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico for Windows requirements (archived 3.25): https://archive-os-3-25.netlify.app/calico/3.25/getting-started/kubernetes/windows-calico/kubernetes/requirements/
- Tigera open-source Calico for Windows announcement: https://www.tigera.io/blog/tigera-announces-open-source-calico-for-windows-and-collaboration-with-microsoft/
- Microsoft Open Source Blog - Calico for Windows: https://opensource.microsoft.com/blog/2020/09/22/calico-for-windows-goes-open-source
- Calico v3.27.0 GitHub release: https://github.com/projectcalico/calico/releases
- RFC 7348 (VXLAN): https://tools.ietf.org/html/rfc7348

## Issues Found
- **Incorrect Calico version requirement**: The prerequisites stated "Calico v3.12+ with Windows support". Open-source Calico for Windows actually GA'd with **Calico v3.16** in September 2020 (per the joint Tigera/Microsoft announcement). v3.12 predates open-source Windows support. Changed to "Calico v3.16+ with Windows support".

## Review Notes
- The install script path `C:\CalicoWindows\install-calico.ps1` is correct — this is the inner installer located inside the extracted zip (not to be confused with the `install-calico-windows.ps1` bootstrap script that some docs use).
- The claim that IP-in-IP is not supported on Windows is correct per official Calico docs.
- BGP peering on Windows is supported, but only in **non-overlay mode** — combining BGP with VXLAN overlay is not supported on Windows. The post does not claim that combination, so no change needed, but readers planning a hybrid deployment should be aware.
- "Windows Server 2019+" is accurate shorthand; for production deployments operators should verify minimum build numbers (e.g., Windows Server 1809 build 17763.1432+, Windows Server 2022 build 20348.169+).
- The tag "Window" in the post header appears to be a typo for "Windows" but this is metadata, not a technical correctness issue, and was left unchanged per scope.
- The VXLAN UDP 4789 reference is correct per RFC 7348 / IANA assignment; Calico uses 4789 on both Linux and Windows for cross-OS interop.
- The "MTU configuration" mentioned in the intro and conclusion isn't actually shown in any code block — a future revision could add an explicit example of FelixConfiguration `vxlanMTU` tuning for Windows (typically 1450 for 1500-byte underlay).
