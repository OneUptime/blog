# How to Create and Use a Resident OpenSSH FIDO2 Key on a Security Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, FIDO2, Security, Authentication

Description: Create a resident OpenSSH FIDO2 credential, recover its local key handles on another computer, and enforce touch and user verification when authenticating.

A resident OpenSSH key lets you take a security key to another computer and recover the files needed to use the same SSH identity. The server still needs your public key, and signing still requires the physical authenticator.

The distinction is between the **credential on the authenticator** and the **reference file on your computer**. OpenSSH calls that file a private key file, but for FIDO keys it contains a key handle that cannot sign independently. With a resident credential, the authenticator also retains enough information to retrieve that handle. Copying or downloading it does not export a standalone signing key. [OpenSSH FIDO architecture](https://www.openssh.org/txt/release-8.2)

## Check the client and authenticator

Use a maintained OpenSSH installation with FIDO support. Basic FIDO and resident-key support arrived in OpenSSH 8.2; the `verify-required` options used below arrived in 8.4. The server must support the security-key algorithm and the verification option too. These are feature boundaries, not recommended versions to install today. [OpenSSH 8.2](https://www.openssh.org/txt/release-8.2), [OpenSSH 8.4](https://www.openssh.org/txt/release-8.4)

On the client:

```bash
command -v ssh ssh-keygen ssh-add ssh-agent
ssh -V
ssh -Q key | grep '^sk-'
```

An algorithm listing does not prove that the build can access hardware. The examples assume a Unix client with OpenSSH's built-in USB provider, normally backed by libfido2 in portable builds. Keep the client tools from a compatible installation. An external provider, when needed, is selected with `ssh-keygen -w`, `ssh-add -S`, or SSH's `SecurityKeyProvider`; it must implement the OpenSSH security-key interface. [Provider architecture](https://www.openssh.org/txt/release-8.2), [ssh-keygen options](https://man.openbsd.org/ssh-keygen), [ssh-add options](https://man.openbsd.org/ssh-add), [SecurityKeyProvider](https://man.openbsd.org/ssh_config#SecurityKeyProvider)

Check that your device supports resident credentials, credential retrieval, and user verification. OpenSSH 10.3p1's built-in provider also requires credential protection (`credProtect`) for resident or `verify-required` enrollment. `ed25519-sk` additionally requires hardware Ed25519 support. If that algorithm is unsupported, use `ecdsa-sk` while retaining the resident and verification options; changing algorithms cannot add missing resident-key functionality. Yubico documents the firmware requirements for its devices. [OpenSSH provider requirements](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sk-usbhid.c), [Yubico SSH guide](https://developers.yubico.com/SSH/Securing_SSH_with_FIDO2.html)

## Create a named resident credential

Attach only the intended authenticator. Set its FIDO2 PIN using its management tool if none exists. For a YubiKey, this command interactively sets or changes that PIN:

```bash
ykman fido access change-pin
```

This command manages the device's FIDO2 PIN. Enter it at the prompt rather than placing it in shell history. [YubiKey FIDO commands](https://docs.yubico.com/software/yubikey/tools/ykman/FIDO_Commands.html)

Choose a new local filename and a distinct application/user combination:

```bash
umask 077
mkdir -p ~/.ssh &&
ssh-keygen -t ed25519-sk \
  -O resident -O verify-required \
  -O application=ssh:work-2026-11 -O user=alice \
  -C "alice-work-security-key" \
  -f ~/.ssh/id_work_fido
```

`resident` enables retrieval later. `verify-required` requests user verification for signatures; the normal touch requirement remains. Verification normally uses a PIN, though supported authenticators can use built-in biometrics. The application must begin with `ssh:`. The user label identifies the credential, not the remote Unix account. Neither label grants server access. [FIDO key options](https://man.openbsd.org/ssh-keygen#FIDO_AUTHENTICATOR), [OpenSSH verification handling](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sk-usbhid.c)

Do not approve an unexpected overwrite prompt: reusing the same application/user pair can replace an existing resident credential. [OpenSSH enrollment implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh-keygen.c)

Follow the device's PIN or biometric verification and touch prompts, then choose a separate passphrase for the local file. The resulting files are:

| File | Purpose |
|---|---|
| `~/.ssh/id_work_fido` | Local reference, optionally encrypted with your file passphrase |
| `~/.ssh/id_work_fido.pub` | Public key to authorize on servers |

The file passphrase protects this local copy. Someone able to retrieve the resident credential can create another reference file with a different passphrase. It therefore does not replace the authenticator PIN. [Resident-key retrieval](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh-keygen.c)

## Authorize and test the identity

Record the public fingerprint:

```bash
ssh-keygen -lf ~/.ssh/id_work_fido.pub
```

Through your existing access or configuration management, add the public key to the target user's authorized keys. Prefix its actual public-key line with `verify-required`:

```text
verify-required sk-ssh-ed25519@openssh.com ACTUAL_BASE64_PUBLIC_KEY alice-work-security-key
```

Replace the example key fields with the complete line from your `.pub` file, keeping `verify-required` at the beginning. This also preserves the correct algorithm if you chose `ecdsa-sk`. Remove any unrestricted duplicate of this same key from applicable authorization sources. The server option requires the signature's verification flag; a client generation option alone is not the server's enforcement policy. Keep the default touch requirement. [Authorized-key options](https://man.openbsd.org/sshd#AUTHORIZED_KEYS_FILE_FORMAT)

For a directly reachable test server, open a fresh connection using the local reference:

```bash
test -f ~/.ssh/id_work_fido && ssh -F /dev/null -S none \
  -o IdentityAgent=none -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  -i ~/.ssh/id_work_fido alice@bastion.example.com
```

This bypasses client configuration, agent identities, and existing multiplexed sessions. Adapt the hostname and connection parameters to your environment. Verify the server's host key through your normal trusted process. Expect the file passphrase, user verification, and touch as applicable. [Identity selection](https://man.openbsd.org/ssh_config#IdentitiesOnly)

## Recover references on another computer

Use an empty private directory so downloaded filenames cannot collide with existing files:

```bash
umask 077
mkdir -p ~/.ssh &&
recovery_dir=$(mktemp -d "$HOME/.ssh/fido-recovery.XXXXXX") &&
cd "$recovery_dir" &&
ssh-keygen -K &&
for public_key in ./*.pub; do
  test -f "$public_key" || continue
  ssh-keygen -lf "$public_key"
done
```

`ssh-keygen -K` writes local reference and public-key files; it is not a listing command. Inspect the filenames it reports, compare fingerprints with your enrollment record, and use the matching reference with `ssh -i`. Downloads may include several SSH credentials. The original local filename, comment, and passphrase are not restored. [Download behavior](https://man.openbsd.org/ssh-keygen#K), [Filename and passphrase handling](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh-keygen.c)

## Load directly into an agent

Alternatively, use an already running OpenSSH agent with `SSH_AUTH_SOCK` set:

```bash
ssh-add -K -t 1h
ssh-add -l
ssh-add -L
```

Here `-K` loads resident identities into the agent, `-l` lists fingerprints, and `-L` lists public keys. It does not create reference files. The one-hour lifetime limits agent availability; the authenticator remains necessary for signing. [ssh-add manual](https://man.openbsd.org/ssh-add)

To select one loaded identity, save its public line as a `.pub` file and pass that file to `ssh -i` with `IdentitiesOnly=yes`. A public identity file can select its matching agent key. [IdentityFile](https://man.openbsd.org/ssh_config#IdentityFile)

PIN entry during loading does not guarantee later signing will work unattended. OpenSSH's agent uses an askpass helper when a signature needs a PIN. If that helper is unavailable, use the direct reference-file workflow above, which can prompt in your terminal. [Agent PIN handling](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh-agent.c)

## Plan for losing the hardware

Reference-file recovery requires the original functioning authenticator. A copied handle cannot turn another security key into its replacement. Enroll an independent credential on a second device, authorize its distinct public key, and test it before relying on either device exclusively.

Keep public fingerprints for revocation. If a device is lost, remove its authorization everywhere it was enrolled. A FIDO reset destroys credentials; it is not a recovery operation for a forgotten PIN. Recovery planning must preserve another working access route. [Yubico recovery and reset guidance](https://developers.yubico.com/SSH/Securing_SSH_with_FIDO2.html)
