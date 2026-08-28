# Validation Summary: How to Replace an ESXi Host Certificate with an External CA in vSphere 8.0 U3+

## Status
validated

## Post Type
Technical guide / operational tutorial

## Technologies Covered
- VMware vSphere 8.0 Update 3 and later
- VMware vCenter Server and ESXi
- VMware Certificate Authority (VMCA)
- VMware Endpoint Certificate Store (VECS) and `TRUSTED_ROOTS`
- External certificate authorities, PKI, X.509 v3 certificates, TLS, and CSRs
- OpenSSL `s_client` and `x509`
- vSAN and vVol/VASA certificate integration considerations

## Sources Consulted
- [Broadcom TechDocs: Replacing the Default ESXi Certificate with a Custom Certificate](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-security/securing-esxi-hosts/certificate-management-for-esxi-hosts/replacing-esxi-certificatea-intro.html)
- [Broadcom TechDocs: Generate a Certificate Signing Request for a Custom Certificate Using the vSphere Client](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-security/securing-esxi-hosts/certificate-management-for-esxi-hosts/replacing-esxi-certificatea-intro/generate-a-certificate-signing-request-for-a-custom-certificate-using-the-vsphere-client.html)
- [Broadcom TechDocs: Replace the Default Certificate with a Custom Certificate Using the vSphere Client](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-security/securing-esxi-hosts/certificate-management-for-esxi-hosts/replacing-esxi-certificatea-intro/replace-the-default-certificate-using-the-vsphere-client.html)
- [Broadcom TechDocs: Change the ESXi Certificate Mode](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-security/securing-esxi-hosts/certificate-management-for-esxi-hosts/change-the-certificate-mode.html)
- [Broadcom TechDocs: ESXi Certificate Mode Switch Workflows](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-security/securing-esxi-hosts/certificate-management-for-esxi-hosts/certificate-mode-switches.html)
- [Broadcom KB 410036: Step-by-step ESXi VMCA-to-custom replacement from the vCenter UI](https://knowledge.broadcom.com/external/article/410036/replacing-the-esxi-custom-certificate-fr.html)
- [Broadcom KB 383320: External-CA controls are disabled until custom mode is set](https://knowledge.broadcom.com/external/article/383320/unable-to-generate-a-csr-to-replace-cust.html)
- [Broadcom KB 390630: Generate an ESXi certificate or CSR with custom parameters](https://knowledge.broadcom.com/external/article/390630)
- [Broadcom KB 384966: Add a trusted root certificate to the vCenter certificate store](https://knowledge.broadcom.com/external/article/384966)
- [Broadcom KB 397317: ESXi custom-certificate FQDN mismatch](https://knowledge.broadcom.com/external/article/397317/importing-custom-ssl-certificate-on-the.html)
- [Broadcom KB 409674: vSphere Client custom-certificate replacement is unavailable before 8.0 U3](https://knowledge.broadcom.com/external/article/409674)
- [Broadcom KB 313460: SHA-1 certificate signatures in vSphere 8.0](https://knowledge.broadcom.com/external/article/313460)
- [Broadcom KB 428283: PKCS#1 private keys rejected by the external-key import path](https://knowledge.broadcom.com/external/article/428283/esxi-host-certificate-replacement-with-c.html)
- [Broadcom KB 335206: vSAN custom-certificate authentication usages](https://knowledge.broadcom.com/external/article/335206)
- [Broadcom KB 323977: vVol/VASA client-authentication requirement](https://knowledge.broadcom.com/external/article/323977)
- [Broadcom KB 317244: Custom ESXi certificates through the CLI, including vSAN use](https://knowledge.broadcom.com/external/article/317244)
- [Broadcom KB 427041: Thumbprint mode is deprecated](https://knowledge.broadcom.com/external/article/427041/vcenter-shows-alarm-for-esxi-certificate.html)
- [OpenSSL 3.6 documentation: `openssl s_client`](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [OpenSSL 3.6 documentation: verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/)
- [OpenSSL 3.6 documentation: `openssl x509`](https://docs.openssl.org/3.6/man1/openssl-x509/)

## Issues Found
- The certificate-template guidance was too broad: a generic SHA-2-family signature can still be unsupported, and the text did not state several Broadcom ESXi certificate requirements. It now requires an X.509 v3 certificate that preserves the ESXi-generated RSA key and requested CN/SAN, includes Digital Signature and Key Encipherment, uses a supported RSA PKCS#1 v1.5 SHA-2 signature rather than RSASSA-PSS, starts one day before replacement, and contains no SHA-1 certificate anywhere in the chain.
- The prerequisite mentioned only TLS server authentication. That can break vSAN, vVol/VASA, or another integration in which ESXi presents the host certificate as a TLS client. The post now calls out TLS Web Client Authentication for those roles and directs readers to product-specific guidance.
- The identity checks mentioned the FQDN and SAN but did not explicitly require both the certificate CN and SAN to match the host identifier stored in vCenter. The prerequisite and completion criteria now state that requirement, and the IP-address case now directs readers to the separate **Generate CSR Using IP** workflow.
- The OpenSSL validation command enabled chain verification but did not verify the peer hostname. The command now includes `-verify_hostname esxi01.example.com`, and the text specifies that the CA certificates must be visible to OpenSSL's trust store rather than merely an operating-system-native trust store.
- The rollback wording implied that changing to `vmca` and renewing could be treated as a normal inventory rollback. It now describes Broadcom's documented custom-CA-to-VMCA workflow—remove all hosts, remove the third-party CA root from VECS, switch mode, and add the hosts back—and warns that other sequences can behave unpredictably.
- Thumbprint mode was described more categorically than Broadcom's documentation supports. The post now says that vCenter 8.x marks it deprecated, that it bypasses CA validity checks, and that it is intended only as a temporary troubleshooting fallback.
- The vSAN caveat was too general. The limitations now direct vSAN hosts to Broadcom KB 317244/legacy KB 56441 instead of implying that the generic in-client workflow alone is sufficient.

## Review Notes
- The vSphere 8.0 U3 availability claim, `vpxd.certmgmt.mode=custom` behavior, case-sensitive value, UI navigation, ESXi-generated CSR/private-key handling, second-CSR warning, leaf-certificate import choice, PKCS#1 private-key caveat, reconnect advice, and lifecycle-management warnings were confirmed.
- Both OpenSSL certificate-inspection pipelines are syntactically valid with current OpenSSL. The inspection pipeline reports the presented leaf but intentionally does not validate it; the separate handshake command performs chain and hostname validation.
- All seven external URLs originally listed in the post returned HTTP 200 and matched their stated topics during review.
- The review was performed against current official documentation and local OpenSSL 3.6.2 command help/behavior; no live vSphere lab was available for an end-to-end replacement.
