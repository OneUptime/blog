# How to Replace an ESXi Host Certificate with an External CA Certificate in vSphere 8.0 U3+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, vSphere 8, TLS, Certificates, External CA, PKI, Security

Description: Replace a VMCA-issued ESXi TLS certificate through the vSphere 8.0 U3 Client using an ESXi-generated CSR and an enterprise CA trust chain.

---

Starting with vSphere 8.0 Update 3, the vSphere Client can replace a default VMCA-signed ESXi host certificate with one signed by an external CA. The workflow keeps the private key on the host when ESXi generates the certificate signing request (CSR), which is preferable to moving a private key between systems.

Certificate mode is a vCenter-wide design choice, not a per-host cosmetic toggle. Broadcom states that setting `vpxd.certmgmt.mode` to `custom` means the inventory's hosts must use custom CA-signed certificates that vCenter does not manage. Plan issuance, renewal, monitoring, and emergency recovery for every host before changing the mode.

This guide applies to vCenter Server and ESXi 8.0 Update 3 or later using the vSphere Client external-CA workflow. Earlier releases do not expose this feature and require their version-specific procedure.

## Prerequisites

Prepare the change as a PKI rollout:

- Confirm vCenter Server and the target host are on a supported 8.0 U3-or-later build.
- Verify that the host is stored in vCenter by its exact ESXi FQDN and that forward and reverse DNS resolve it correctly. Broadcom requires the certificate CN and SAN to match the host name or IP address recorded in inventory and documents import failure when they do not.
- Confirm correct NTP time on vCenter, ESXi, the CA, and the validation workstation.
- Obtain the enterprise root and every issuing intermediate CA certificate in Base-64 PEM form.
- Confirm the CA template preserves the ESXi-generated RSA public key and requested CN and DNS SAN, and issues an X.509 v3 certificate with Digital Signature and Key Encipherment. Use a supported RSA PKCS#1 v1.5 SHA-2 signature such as `sha256WithRSAEncryption`, not RSASSA-PSS, set the certificate start time one day before the replacement, use your organization's approved lifetime, and ensure that no certificate in the returned chain uses SHA-1.
- Confirm the issued certificate is valid for TLS Web Server Authentication. If the host uses vSAN, vVol/VASA, or another integration in which ESXi authenticates as a TLS client, include TLS Web Client Authentication as well and follow that product's certificate guidance.
- Back up vCenter Server according to the deployment topology and record the current ESXi certificate details.
- Test one noncritical host first and keep out-of-band console access available in case trust or identity errors disconnect it.

Do not request a wildcard certificate. Broadcom's ESXi custom-certificate guidance requires a unique certificate tied to each host's FQDN.

## Record the Existing Certificate

In the vSphere Client, select the host and open **Configure > System > Certificate**. Record its subject, issuer, serial number, validity period, and SHA-256 fingerprint.

From a trusted administrative workstation, capture what the live endpoint presents:

```bash
openssl s_client -connect esxi01.example.com:443 -servername esxi01.example.com </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -serial -dates -fingerprint -sha256 -ext subjectAltName
```

Use the FQDN by which the host is stored in vCenter. If the host is stored by IP address, use Broadcom's corresponding **Generate CSR Using IP** workflow and ensure that both the certificate CN and SAN match that inventory IP.

## Trust the External CA in vCenter First

Before replacing any host leaf certificate, add its issuer chain to vCenter Server's trusted root store.

1. In the vSphere Client, open **Menu > Administration > Certificates > Certificate Management**.
2. Under **Trusted Root Certificates**, choose **Add**.
3. Import the external root and, when applicable, the issuing intermediate certificate chain.
4. Verify that the expected subjects, issuers, fingerprints, and validity periods appear in the trusted store.

Broadcom explicitly requires the custom CA root to be trusted by vCenter before host certificates are updated. Importing a host leaf without establishing its chain can disconnect the host or cause replacement to fail.

## Change vCenter to Custom Certificate Mode

In the vSphere Client:

1. Select the vCenter Server object.
2. Open **Configure > Settings > Advanced Settings**.
3. Choose **Edit Settings** and filter for `vpxd.certmgmt.mode`.
4. Change the value from `vmca` to `custom` and save it.

The value is case-sensitive. If **Generate CSR** and import choices remain disabled under **Manage with External CA**, Broadcom identifies the default certificate mode as the expected cause; recheck the setting and the documented service/UI refresh requirements for the installed patch level.

Do not leave a mixed inventory indefinitely after changing this global mode. Track every host that still needs its external certificate, and do not use **Renew Certificate** as though VMCA still owns the lifecycle.

## Generate the CSR on ESXi

For the target host, open **Configure > System > Certificate**, select **Manage with External CA**, and choose **Generate CSR using FQDN**.

Copy the complete PEM CSR, including its begin and end lines, into the approved CA enrollment workflow. Because ESXi generated this CSR, its private key remains associated with the pending request on the host.

Before issuance, have the CA operator inspect the CSR and confirm the requested FQDN. Issue a TLS server certificate from the intended template and verify that the returned certificate meets the requirements above. Download the signed host certificate in Base-64 encoded form. Broadcom's step-by-step Microsoft CA example specifically selects the issued certificate rather than the downloaded certificate-chain bundle for this ESXi-generated-CSR import path.

Do not generate a second CSR after the CA signs the first one. A certificate issued from one CSR will not match the private key associated with another pending request.

## Import and Replace the Host Certificate

Return to **Host > Configure > System > Certificate > Manage with External CA** and select **Import and Replace**.

1. Choose **Replace with external CA certificate where CSR is generated by ESXi (private key embedded)**.
2. Upload the signed host certificate returned for that exact CSR.
3. Review the parsed subject, issuer, validity period, and host identity.
4. Finish the replacement and monitor the vCenter task.

The alternate option for a CSR and key generated outside ESXi requires uploading the matching private key and has different handling. Do not select it for this workflow. Broadcom also documents that externally supplied keys with an `-----BEGIN RSA PRIVATE KEY-----` PKCS#1 header can be rejected; the safer host-generated CSR path avoids importing a private key at all.

## Verify Trust and the Live Endpoint

Refresh **Configure > System > Certificate** and confirm the new serial, issuer, dates, and fingerprint. Then repeat the live handshake from a workstation whose OpenSSL trust store contains the enterprise root and intermediates:

```bash
openssl s_client -connect esxi01.example.com:443 -servername esxi01.example.com -verify_hostname esxi01.example.com -verify_return_error </dev/null
```

Inspect the presented leaf again:

```bash
openssl s_client -connect esxi01.example.com:443 -servername esxi01.example.com </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -serial -dates -fingerprint -sha256 -ext subjectAltName
```

Completion requires all of the following:

- the live SHA-256 fingerprint matches the newly issued certificate;
- the certificate CN and DNS SAN match the FQDN by which the host is stored in vCenter;
- the current time falls within the validity interval;
- chain validation succeeds from vCenter and representative clients;
- the host remains connected and manageable in vCenter;
- HA and integrated products report normal trust.

If replacement succeeds but the UI or connection still reflects the old certificate, Broadcom KB 410036 advises disconnecting and reconnecting the host. Do that as a controlled inventory operation only after confirming the new certificate chain and credentials; never remove a host casually from a vDS-dependent or cluster-sensitive design.

## Plan Renewal Before Finishing

Custom mode transfers host certificate lifecycle responsibility to the administrator. Record the certificate owner, CA request identifier, expiry, renewal lead time, and validation procedure. Monitor expiry externally and rehearse renewal before the first certificate approaches its deadline.

Keep the old certificate fingerprint, CA chain, vCenter backup, and console-access plan for the change window. Do not retain or export a private key from the host-generated workflow.

## Rollback and Recovery Cautions

Do not treat changing `vpxd.certmgmt.mode` back to `vmca` and renewing a host certificate as a simple per-host rollback. Broadcom's documented custom-CA-to-VMCA mode-switch workflow removes all hosts from vCenter, removes the third-party CA root from VECS, changes the mode to `vmca`, and then adds the hosts back; it warns that other workflows can produce unpredictable behavior. Plan that as an inventory-wide certificate-architecture migration, and assess all dependencies before removing a trust root. A later VMCA renewal overwrites a custom host certificate.

If the host disconnects, first check FQDN identity, time, and whether the full issuing chain exists in vCenter's trusted store. Use **Connection > Reconnect** after correcting trust. Avoid thumbprint mode as a permanent bypass; vCenter 8.x marks it deprecated, it bypasses CA validity checks, and Broadcom recommends it only as a temporary troubleshooting fallback.

## Limitations and Version Scope

The in-client ESXi external-CA workflow is available in vCenter 8.0 U3 and later; Broadcom KB 409674 confirms it is absent in 8.0 U2 and earlier. Button names can vary by patch. For a host in a vSAN cluster, Broadcom directs administrators to the separate vSAN-capable procedure in KB 317244 (legacy KB 56441) instead of relying solely on this generic UI workflow. Custom certificate behavior in NSX, VCF, Enhanced Linked Mode, and third-party integrations can add trust and certificate-usage requirements, so validate those products before an inventory-wide rollout.

## Official Documentation

- [Replace the default ESXi certificate using the vSphere Client](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-security/securing-esxi-hosts/certificate-management-for-esxi-hosts/replacing-esxi-certificatea-intro/replace-the-default-certificate-using-the-vsphere-client.html)
- [Replacing the default ESXi certificate with a custom certificate: requirements](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-security/securing-esxi-hosts/certificate-management-for-esxi-hosts/replacing-esxi-certificatea-intro.html)
- [Change the ESXi certificate mode](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-security/securing-esxi-hosts/certificate-management-for-esxi-hosts/change-the-certificate-mode.html)
- [ESXi certificate mode switch workflows](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-security/securing-esxi-hosts/certificate-management-for-esxi-hosts/certificate-mode-switches.html)
- [Step-by-step ESXi custom certificate replacement (Broadcom KB 410036)](https://knowledge.broadcom.com/external/article/410036/replacing-the-esxi-custom-certificate-fr.html)
- [External-CA controls are disabled until custom mode is set (Broadcom KB 383320)](https://knowledge.broadcom.com/external/article/383320/unable-to-generate-a-csr-to-replace-cust.html)
- [Generate an ESXi CSR with custom parameters (Broadcom KB 390630)](https://knowledge.broadcom.com/external/article/390630)
- [Add a trusted root certificate to vCenter (Broadcom KB 384966)](https://knowledge.broadcom.com/external/article/384966)
- [ESXi certificate FQDN mismatch (Broadcom KB 397317)](https://knowledge.broadcom.com/external/article/397317/importing-custom-ssl-certificate-on-the.html)
- [Add a custom certificate to ESXi through the CLI, including vSAN use (Broadcom KB 317244)](https://knowledge.broadcom.com/external/article/317244)

## Conclusion

The reliable sequence is trust first, custom mode second, then one ESXi-generated CSR and its matching signed leaf. Validate the live TLS endpoint—not only the vSphere task—and treat renewal as an ongoing operational responsibility for the full inventory.
