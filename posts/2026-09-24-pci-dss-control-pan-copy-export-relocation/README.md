# How to Control PAN Copying, Export, and Relocation from the CDE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security, Compliance

Description: Restrict PAN copying through remote access, authorize necessary exports explicitly, and verify destinations and technical controls with realistic tests.

---

A support agent may need to inspect a payment record without needing permission to download the underlying card number. Treat viewing, querying, copying, and exporting as separate capabilities. Otherwise, an ordinary troubleshooting workflow can create a new cardholder-data store on a laptop or in a shared drive.

The useful starting point is a list of permitted transfers and a technical barrier around every other transfer.

## Identify the specific PCI requirement

PCI DSS v4.0.1 Requirement 3.4.2 addresses remote-access technologies. It requires technical controls preventing personnel from copying or relocating PAN unless they have documented, explicit authorization and a legitimate, defined business need. Its applicability notes explain that destination devices holding relocated PAN enter PCI DSS scope.

That is more specific than a universal prohibition on all exports. Other storage, access, transmission, and logging requirements continue to apply to an approved export. Read the requirement alongside Requirements 3, 4, 7, 8, and 10 in the [current standard](https://www.pcisecuritystandards.org/document_library/).

A policy telling employees not to copy data does not, by itself, supply the technical controls required by 3.4.2.

## Map the routes data can leave through

Inventory the remote-access products used by employees, vendors, and administrators. Include virtual desktops, remote desktop sessions, privileged-access gateways, and browser-based administration tools.

For each route, investigate more than clipboard text:

| Route | Example protection to evaluate |
|---|---|
| Clipboard | Disable redirection or restrict supported directions and formats |
| Mapped local drives | Disable drive redirection for ordinary sessions |
| File transfer | Limit transfer features to explicitly authorized roles |
| Printer redirection | Prevent uncontrolled local print destinations |
| In-session browser | Restrict uploads and downloads to approved destinations |
| Database export | Separate raw-data export permission from normal application access |

These are examples of controls to assess against your architecture. They are not a claim that every product supports every setting or that one setting covers all routes.

A VPN connection alone does not restrict what an authorized user can copy after connection.

## Implement a restricted default session

Start with a normal support role that receives masked payment information and cannot request a raw PAN export. Restrict direct access to query stored cardholder data to the responsible administrators; other users should access it through applications or other programmatic methods that enforce allowed actions and least privilege independently of the user interface.

For remote desktops, configure both the service and the session host where required. Microsoft documents how clipboard policy interacts with host-pool properties and client behavior in its [clipboard-redirection guidance](https://learn.microsoft.com/en-us/azure/virtual-desktop/redirection-configure-clipboard). Use the product's effective configuration and supported-client matrix rather than assuming the setting displayed in one console is decisive.

Retest after policy refresh, any required session-host restart, and reconnecting sessions. Microsoft’s clipboard-redirection guidance requires restarting session hosts after applying the cited Intune or Group Policy settings. A policy change that affects only newly established sessions can leave existing users with different behavior.

Keep authorized export sessions distinct enough that their permissions can be reviewed and revoked reliably. This might be a dedicated role, application workflow, or access gateway policy.

## Make legitimate exports reviewable

An export request should answer:

- Who needs the data, and for which defined business operation?
- Why will a token or masked value not meet the need?
- Which records and fields are permitted?
- Which named destination is authorized to store the result?
- How will transmission, access, retention, and disposal be controlled?
- When does the authorization expire?

Record the approving authority and the operator. Avoid open-ended permission such as “finance can export everything.”

Prefer an application-generated transfer directly to the approved recipient over a manually downloaded spreadsheet when that meets the business need. The transfer should carry only the necessary fields and use the required protections. Its logs should contain an export ID, record count, destination identifier, and outcome without exposing PAN.

Explicit permission to export is not permission to retain CVV or other SAD after authorization.

## Test denied and authorized behavior

Use synthetic card records and an ordinary user account. Attempt clipboard copy, drive mapping, file download, local printing, and application export through each supported client. Check whether alternative clients or older gateways expose different functionality.

Next, test the authorized path. Verify the approved user can complete only the specified transfer, the destination is correct, and the resulting file receives the intended protection. Confirm the permission stops working after revocation or expiry.

Keep the expected result, actual result, configuration version, and test identity in the evidence record. A screenshot of a disabled setting is useful context, but an observed denied transfer is stronger operational evidence.

Technical controls cannot eliminate every way information visible to a person might be recorded. Minimize full-PAN display, control the working environment, and investigate suspicious behavior as part of the broader security program.

## Monitor for destinations you did not intend

Review unusual export volumes, newly enabled redirection, unexpected object-storage writes, and downloads outside approved workflows. Route unexpected stored PAN into the response procedures required by Requirement 12.10.7.

After an export finishes, track its disposal as carefully as its creation. The objective is a controlled, justified movement of card data whose destination and lifetime remain known.
