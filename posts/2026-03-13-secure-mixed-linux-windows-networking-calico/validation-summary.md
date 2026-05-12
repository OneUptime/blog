# Validation Summary: How to Secure Mixed Linux and Windows Networking with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (open-source Kubernetes networking)
- Kubernetes
- Windows Server (containers / nodes)
- Linux (containers / nodes)
- VXLAN encapsulation
- BGP
- PowerShell (Windows installation)
- kubectl

## Sources Consulted
- Calico for Windows documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/
- Calico release history / GitHub releases: https://github.com/projectcalico/calico/releases
- Calico v3.21 release notes (introduced open-source Windows support): https://docs.tigera.io/calico/3.21/release-notes/
- IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- IANA VXLAN UDP port assignment (4789): RFC 7348
- Windows `ping` command reference: Microsoft Docs (`ping /?`)

## Issues Found
- **Incorrect minimum Calico version**: The Prerequisites section originally listed "Calico v3.12+ with Windows support". Open-source Calico for Windows was not available until v3.21 (October 2021); prior to that, Windows support was only offered through Tigera's commercial product. The installation method shown in the post (downloading `calico-windows-vX.Y.Z.zip` from the projectcalico/calico GitHub releases and running `install-calico.ps1`) is also v3.21+. Updated to "Calico v3.21+ with Windows support".

## Review Notes
- The claim that IP-in-IP is not supported on Windows and VXLAN is required is correct.
- VXLAN UDP port 4789 is correct (IANA-assigned default).
- The IPPool manifest (`apiVersion: projectcalico.org/v3`, `kind: IPPool`, fields `cidr`, `vxlanMode`, `ipipMode`, `natOutgoing`) is valid.
- The Windows installation URL `https://github.com/projectcalico/calico/releases/download/v3.27.0/calico-windows-v3.27.0.zip` follows the correct release asset naming convention.
- Windows Server 2019 is the documented minimum supported Windows OS for Calico for Windows.
- `ping -c` (Linux) vs `ping -n` (Windows) usage is correct.
- The tag "Window" in the post header appears to be a typo for "Windows", but it is a stylistic issue rather than a technical error and was left unchanged per review scope.
- BGP peering for Windows nodes has additional constraints versus Linux (e.g., no route reflector role); deep coverage is out of scope for this introductory post.
