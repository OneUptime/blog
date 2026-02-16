# How to Configure Azure Pipelines Secure Files for Certificate and Key Management in Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Secure Files, Certificates, Key Management, CI/CD, Security, Build Pipeline

Description: Learn how to upload, manage, and use secure files in Azure Pipelines for handling certificates, signing keys, and other sensitive files in your build process.

---

Build and release pipelines often need access to sensitive files - code signing certificates, SSH private keys, provisioning profiles for mobile builds, keystores for Android signing, or PEM files for TLS configuration. Checking these files into source control is a serious security risk, even in private repositories. Azure Pipelines Secure Files gives you a way to store these files securely and reference them in your pipelines without exposing them to source control.

Secure files are encrypted at rest, access-controlled through pipeline permissions, and downloaded only to the agent during the job that needs them. Once the job completes, the files are cleaned up automatically. This makes them ideal for any file that should never appear in a Git repository.

## Uploading Secure Files

Navigate to your Azure DevOps project, go to Pipelines, then Library, then click the "Secure files" tab. Click the "+ Secure file" button to upload a file.

You can upload any file type. Common examples include `.pfx` certificate files, `.p12` files for iOS signing, `.keystore` files for Android, `.pem` files for SSH or TLS, and `.json` credential files for cloud providers.

After uploading, each secure file gets a unique ID and shows up in the list with its name and the date it was uploaded. By default, only the person who uploaded the file can authorize pipelines to use it.

## Setting Permissions on Secure Files

Each secure file has its own permissions. Click on the file name to access its settings. Under "Pipeline permissions," you can choose to authorize all pipelines or restrict access to specific pipelines.

For high-security files like production signing certificates, restrict access to only the release pipelines that need them. For development certificates, allowing all pipelines is usually fine.

You can also assign security roles at the file level. Users with the "Administrator" role can manage the file and its permissions. Users with the "User" role can reference it in pipelines. The "Reader" role can see that the file exists but cannot use it.

## Using Secure Files in YAML Pipelines

The `DownloadSecureFile` task downloads a secure file to a temporary location on the build agent. You reference the file by its name (as uploaded to the library).

```yaml
# azure-pipelines.yml - Using a secure file for code signing

trigger:
  - main

pool:
  vmImage: 'windows-latest'

steps:
  # Download the code signing certificate from Secure Files
  - task: DownloadSecureFile@1
    name: signingCert
    displayName: 'Download Code Signing Certificate'
    inputs:
      secureFile: 'code-signing-cert.pfx'

  # Build the application
  - task: DotNetCoreCLI@2
    displayName: 'Build Application'
    inputs:
      command: 'build'
      projects: '**/*.csproj'
      arguments: '--configuration Release'

  # Sign the built assemblies using the downloaded certificate
  - task: PowerShell@2
    displayName: 'Sign Assemblies'
    inputs:
      targetType: 'inline'
      script: |
        # The secure file path is available through the output variable
        $certPath = "$(signingCert.secureFilePath)"
        Write-Host "Certificate downloaded to: $certPath"

        # Use signtool to sign the assemblies
        # The certificate password is stored as a pipeline secret variable
        $assemblies = Get-ChildItem -Path "$(Build.ArtifactStagingDirectory)" -Filter "*.dll" -Recurse
        foreach ($assembly in $assemblies) {
            & "C:\Program Files (x86)\Windows Kits\10\bin\x64\signtool.exe" sign `
                /f "$certPath" `
                /p "$(CertPassword)" `
                /tr http://timestamp.digicert.com `
                /td sha256 `
                /fd sha256 `
                "$($assembly.FullName)"
        }
```

The key thing to notice is the `name: signingCert` property on the download task. This creates a variable `$(signingCert.secureFilePath)` that gives you the full path to the downloaded file. You can use this in subsequent tasks.

## Android Keystore Signing

For Android builds, you need a keystore file to sign your APK or AAB. Here is how to use a secure file for Android signing.

```yaml
# Android build pipeline with keystore from Secure Files

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Download the Android keystore
  - task: DownloadSecureFile@1
    name: androidKeystore
    displayName: 'Download Android Keystore'
    inputs:
      secureFile: 'release-keystore.jks'

  # Build and sign the Android app
  - task: Gradle@3
    displayName: 'Build and Sign APK'
    inputs:
      workingDirectory: 'android'
      gradleWrapperFile: 'android/gradlew'
      tasks: 'assembleRelease'
      options: |
        -Pandroid.injected.signing.store.file=$(androidKeystore.secureFilePath)
        -Pandroid.injected.signing.store.password=$(KEYSTORE_PASSWORD)
        -Pandroid.injected.signing.key.alias=$(KEY_ALIAS)
        -Pandroid.injected.signing.key.password=$(KEY_PASSWORD)

  # Publish the signed APK as a build artifact
  - task: PublishBuildArtifacts@1
    displayName: 'Publish Signed APK'
    inputs:
      pathToPublish: 'android/app/build/outputs/apk/release/'
      artifactName: 'android-release'
```

## iOS Provisioning Profile and Certificate

iOS builds need both a signing certificate (`.p12`) and a provisioning profile (`.mobileprovision`). Azure Pipelines has dedicated tasks for installing these.

```yaml
# iOS build pipeline with certificate and provisioning profile from Secure Files

pool:
  vmImage: 'macos-latest'

steps:
  # Install the Apple signing certificate
  - task: InstallAppleCertificate@2
    displayName: 'Install Signing Certificate'
    inputs:
      certSecureFile: 'ios-distribution.p12'
      certPwd: '$(P12_PASSWORD)'
      keychain: 'temp'
      deleteCert: true

  # Install the provisioning profile
  - task: InstallAppleProvisioningProfile@1
    displayName: 'Install Provisioning Profile'
    inputs:
      provisioningProfileLocation: 'secureFiles'
      provProfileSecureFile: 'AppStore_Distribution.mobileprovision'
      removeProfile: true

  # Build the iOS app
  - task: Xcode@5
    displayName: 'Build iOS App'
    inputs:
      actions: 'build'
      scheme: 'MyApp'
      sdk: 'iphoneos'
      configuration: 'Release'
      xcWorkspacePath: 'ios/MyApp.xcworkspace'
      signingOption: 'manual'
      signingIdentity: '$(APPLE_CERTIFICATE_SIGNING_IDENTITY)'
      provisioningProfileUuid: '$(APPLE_PROV_PROFILE_UUID)'
```

## SSH Key Management

For pipelines that need to SSH into servers or clone private repositories, you can store SSH private keys as secure files.

```yaml
# Pipeline that uses an SSH key to deploy to a remote server

steps:
  # Download the SSH private key
  - task: DownloadSecureFile@1
    name: sshKey
    displayName: 'Download SSH Key'
    inputs:
      secureFile: 'deploy-server-key.pem'

  # Set correct permissions on the key file (SSH requires this)
  - task: Bash@3
    displayName: 'Set SSH Key Permissions'
    inputs:
      targetType: 'inline'
      script: |
        # SSH requires private keys to have restricted permissions
        chmod 600 $(sshKey.secureFilePath)
        echo "SSH key permissions set"

  # Deploy to the remote server
  - task: Bash@3
    displayName: 'Deploy to Server'
    inputs:
      targetType: 'inline'
      script: |
        # Use the SSH key to connect and deploy
        ssh -i $(sshKey.secureFilePath) \
            -o StrictHostKeyChecking=no \
            deploy@production-server.example.com \
            "cd /opt/app && git pull && docker-compose up -d"
```

## Managing Secure Files with the Azure CLI

You can manage secure files programmatically using the Azure DevOps REST API or CLI. This is useful for automation and rotating files.

```bash
# Upload a new secure file using the Azure DevOps CLI
az pipelines secure-file upload \
  --org "https://dev.azure.com/your-org" \
  --project "your-project" \
  --name "new-certificate.pfx" \
  --file "/path/to/certificate.pfx"

# List all secure files in the project
az pipelines secure-file list \
  --org "https://dev.azure.com/your-org" \
  --project "your-project" \
  --output table

# Delete an old secure file
az pipelines secure-file delete \
  --org "https://dev.azure.com/your-org" \
  --project "your-project" \
  --id "secure-file-id" \
  --yes
```

## Rotating Certificates and Keys

Certificate rotation is a regular maintenance task. Here is a practical approach for rotating secure files without breaking pipelines.

First, upload the new certificate with a versioned name (like `code-signing-cert-v2.pfx`). Then update the pipeline YAML to reference the new name. Deploy the pipeline change and verify it works. Finally, delete the old secure file.

For teams that want zero-downtime rotation, use a variable group to store the secure file name. Update the variable group to point to the new file, and all pipelines that reference the variable will pick up the new file on their next run.

```yaml
# Use a variable group to reference the secure file name
# This allows rotating files by updating the variable group
variables:
  - group: 'signing-config'  # Contains SIGNING_CERT_FILE variable

steps:
  - task: DownloadSecureFile@1
    name: signingCert
    inputs:
      secureFile: '$(SIGNING_CERT_FILE)'  # Resolved from variable group
```

## Security Considerations

Secure files are encrypted at rest in Azure DevOps. They are only decrypted when downloaded to an agent during a pipeline run. The download happens over HTTPS, and the file is stored in a temporary directory that is cleaned up after the job.

However, keep in mind that any task in the same job can access the downloaded file through the file system. If you have untrusted tasks or scripts in your pipeline, they could potentially read the secure file. To mitigate this, run sensitive signing operations in a separate job or stage that contains only trusted tasks.

Also, be aware that pipeline logs might inadvertently expose certificate details. Review your scripts to ensure they do not echo certificate passwords, file contents, or other sensitive information to the log output.

Secure files fill a critical gap in CI/CD security. They keep sensitive files out of source control, provide access control at the pipeline level, and ensure automatic cleanup after use. For any pipeline that handles certificates, keys, or credential files, secure files should be your default approach.
