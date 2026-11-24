# What to Redact Before Publishing an Incident Postmortem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, Security, Privacy, Incident Response

Description: Review postmortems for credentials, personal information, hidden document content, and security details while preserving an honest explanation of the incident.

A postmortem can explain an incident accurately and still expose a credential in a screenshot, identify a customer through a distinctive workload, or reveal an unfixed vulnerability. Publication review must examine the material being released, not just the main narrative.

Redaction means removing information from the publication artifact so the recipient cannot recover it from that artifact. It is different from obscuring text on screen, restricting the source document, or deleting inconvenient facts from the incident account.

The practical goal is to preserve the explanation and customer impact while controlling unnecessary disclosure. This article describes an engineering review workflow; decisions about legal obligations need the people responsible for your jurisdiction, contracts, and incident.

## Start with a separate publication candidate

Keep the original incident evidence in its approved, access-controlled location. Create a separate publication candidate containing only the report and intended attachments. Do not overwrite the evidence copy while preparing the public version.

Inventory everything recipients will receive: the page, downloadable files, charts, images, link destinations, filenames, and any exported document. A sanitized paragraph can still link directly to an unrestricted log archive.

Record the candidate's revision and intended audience. A report shared with one customer under an agreement is a different disclosure from a public blog, and it may still need information about other customers removed.

## Review four different kinds of information

| Category | Examples to examine | Preferred treatment |
|---|---|---|
| Credentials and access material | Tokens, passwords, session cookies, private keys, signed download URLs | Remove from publication; assess and contain any actual exposure |
| Personal or identifying information | Names, email addresses, user IDs, distinctive request details | Remove, aggregate, or replace with reviewed non-identifying descriptions |
| Security-sensitive implementation detail | Unfixed exploit steps, bypass conditions, sensitive control locations | Coordinate with security reviewers and preserve the useful high-level mechanism |
| Restricted business or third-party material | Private support exchanges, contract details, customer-specific architecture | Review the disclosure permission and necessity |

OWASP's logging guidance identifies credentials, access tokens, sensitive personal information, and other restricted data as material that should not be recorded directly in ordinary logs. Those categories are also useful when reviewing log excerpts for publication. [OWASP data-to-exclude guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## Treat an exposed secret as more than an editing problem

If a genuine credential has already reached an unauthorized audience, removing it from the report does not make it trustworthy again. Use the relevant credential owner's revocation or rotation process, determine where copies went, and review possible use. Preserve necessary evidence through the incident process.

GitHub's sensitive-data guidance explicitly puts revocation or rotation before repository cleanup when a secret is exposed. It also explains why rewriting history has coordination costs and does not automatically remove every copy. [Handling exposed secrets](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

Do not include a secret's original value in the redaction log. Record its location and category, such as “authorization header in attachment B,” and reference the restricted remediation record.

## Remove identifying context, not only names

PII means personally identifiable information. A name is an obvious example, but combinations of details can identify someone even after names are removed. A precise timestamp, uncommon job title, small customer cohort, and recognizable workflow may reveal more than an arbitrary replacement label suggests.

Consider this fictional transformation:

| Internal detail | Publication wording |
|---|---|
| Named customer, email address, and full request path | An affected customer request |
| Tenant-specific document identifier | A document export |
| Four retries tied to the same unique job | One export job was retried four times |
| Detailed account-level timeline | Reviewed aggregate impact and recovery milestones |

The retry relationship remains because it explains the mechanism. The identifiers disappear because readers do not need them to understand it.

Replacing a name with “Customer A” does not establish anonymity. Review whether other released information makes the identity obvious. Avoid claiming that data is anonymous merely because direct identifiers were removed.

## Inspect hidden content and exported files

Document formats can retain information outside the visible page. Check comments, tracked changes, author metadata, hidden sheets, embedded objects, and source data behind charts. Screenshots need their own review for browser tabs, terminal prompts, account menus, and background windows.

The UK's Information Commissioner's Office documents the risk of hidden personal information and provides guidance on reviewing disclosure formats. Its guidance is jurisdiction-specific; the document-handling issues are useful technical checks without establishing that a particular disclosure is lawful. [Hidden document information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/security/disclosing-documents-to-the-public-securely/avoid-an-accidental-breach-when-personal-information-is-hidden-in-documents/)

A black rectangle over text may leave the underlying text available to selection, copying, or extraction. Use a tool's actual redaction feature where appropriate, then reopen the exported result and check it independently. Flattening a screenshot does not address every other file, metadata field, or attachment in the publication package. [Redaction pitfalls](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/security/disclosing-documents-to-the-public-securely/how-do-we-avoid-an-accidental-breach-when-redacting-information/)

## Use a narrow text check as an additional signal

The following read-only command checks selected text files in a local publication directory. Install `rg`, the ripgrep search tool, first; this example was checked with ripgrep 15.2.0. Replace `./publication-candidate` with your private staging directory.

```bash
rg --no-config --files-with-matches --ignore-case \
  --hidden --no-ignore --glob '*.md' --glob '*.txt' \
  -e 'authorization:[[:space:]]*bearer' \
  -e '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' \
  -e 'password[[:space:]]*[:=]' \
  -- ./publication-candidate
```

It prints matching filenames rather than the matching values. Hidden files and ignored files are included when they match the selected extensions. `--no-config` prevents a personal ripgrep configuration from changing this example's behavior. The options are documented in the project's versioned source. [ripgrep 15.2.0 options](https://github.com/BurntSushi/ripgrep/blob/15.2.0/crates/core/flags/defs.rs)

Exit status 0 means a match was found, 1 means no match, and 2 indicates an error. Review errors instead of treating an incomplete search as clean. Filenames may themselves be sensitive, so keep the output within the review environment.

This is not a comprehensive secret detector. It misses other credential formats, personal information, images, archives, PDFs, files outside those extensions, and content reached only through symbolic links. A discussion of password handling can also trigger a harmless match. The intended outcome is a short queue for human inspection, not a publication approval.

## Coordinate security detail and legal review

When an incident involves a vulnerability, distinguish the information customers need to protect themselves from instructions that would enable exploitation before remediation. Security reviewers should coordinate timing and affected-party communication. CERT's coordinated-disclosure guidance describes aligning publication with the vendor's response rather than treating a blog post as an isolated event. [Coordinated vulnerability publication](https://certcc.github.io/CERT-Guide-to-CVD/topics/phases/publishing/)

Give legal or privacy reviewers concrete questions: whether a quoted support exchange may be disclosed, whether the audience changes contractual requirements, whether personal information remains identifiable, and whether separate notification duties apply. A postmortem publication process should not substitute for those assessments or delay an independently required notification.

Record a specific decision and owner for withheld details. “Legal said no” is not an actionable review record. A useful entry states the affected passage, the issue to resolve, an approved alternative, and the next decision date without reproducing the sensitive content.

## Check that the explanation survived

After redaction, have a technical reviewer reread the public candidate. It should still describe what customers experienced, the supported failure mechanism, recovery milestones, and the actual status of improvements.

If removing a hostname makes a sentence confusing, replace it with its role: “the export worker” or “the downstream identity service.” If a detailed security mechanism must remain restricted, state the supported high-level explanation and any limits on what is being disclosed.

Finally, review the exact files and page that will be released, with their final links and attachments. Record the approved revision and reviewers. This preserves two things at once: a useful account of the incident and a deliberate boundary around the information readers do not need.
