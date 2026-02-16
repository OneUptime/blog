# How to Build a Custom Power Apps Connector for Azure Blob Storage with OAuth 2.0 Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power Apps, Azure Blob Storage, Custom Connector, OAuth 2.0, Azure AD, Power Platform, REST API

Description: Learn how to build a custom Power Apps connector for Azure Blob Storage using OAuth 2.0 authentication with Azure AD app registrations.

---

Power Apps has a built-in Azure Blob Storage connector, but it is limited. If you need fine-grained control over blob operations, custom headers, or specific API versions, building your own custom connector is the way to go. This guide walks through creating a custom connector that authenticates against Azure Blob Storage using OAuth 2.0 via Azure Active Directory.

## Why Build a Custom Connector?

The default Azure Blob Storage connector in Power Apps covers basic upload and download scenarios. However, there are several cases where it falls short:

- You need to set custom metadata on blobs during upload.
- You want to use specific API versions for features like immutability policies.
- You need to list blobs with fine-grained prefix filtering.
- Your organization requires delegated access through Azure AD rather than shared access keys.

A custom connector gives you full control over the HTTP requests sent to the Azure Blob Storage REST API, and OAuth 2.0 ensures tokens are scoped properly.

## Step 1: Register an Azure AD Application

First, you need an app registration in Azure AD that represents your connector.

1. Go to the Azure portal and navigate to Azure Active Directory > App registrations.
2. Click New registration.
3. Set the name to something like "PowerApps Blob Connector".
4. For Redirect URI, select Web and enter `https://global.consent.azure-apim.net/redirect`. This is the redirect URL that Power Apps custom connectors use.
5. Click Register.

After registration, note down the Application (client) ID and the Directory (tenant) ID. You will need both later.

Next, create a client secret:

1. Go to Certificates & secrets > New client secret.
2. Add a description and set an expiration period.
3. Copy the secret value immediately since you cannot retrieve it later.

Now configure API permissions:

1. Go to API permissions > Add a permission.
2. Select Azure Storage and check `user_impersonation`.
3. Click Add permissions and then Grant admin consent if you have the rights.

## Step 2: Create the Custom Connector in Power Apps

Go to Power Apps maker portal, navigate to Dataverse > Custom Connectors, and click New custom connector > Create from blank.

Set the general information:

- Host: `yourstorageaccount.blob.core.windows.net`
- Base URL: `/`
- Scheme: HTTPS

## Step 3: Configure OAuth 2.0 Security

On the Security tab, select OAuth 2.0 as the authentication type and fill in the following fields:

- Identity Provider: Azure Active Directory
- Client ID: the Application ID from your app registration
- Client Secret: the secret you created
- Authorization URL: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`
- Token URL: `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
- Refresh URL: same as Token URL
- Scope: `https://storage.azure.com/user_impersonation`
- Resource URL: `https://storage.azure.com/`

Replace `{tenant-id}` with your actual Azure AD tenant ID.

## Step 4: Define Connector Actions

Now you define the API operations your connector will support. Here are three essential ones.

### Action 1: List Blobs

This action lists blobs in a container using the Azure Blob Storage REST API.

```
GET /{container-name}?restype=container&comp=list&prefix={prefix}
```

Set the following parameters:

- `container-name` (path parameter, required)
- `prefix` (query parameter, optional)
- `x-ms-version` header set to `2023-11-03`

The response schema should be XML. Power Apps will parse the blob list from the response.

### Action 2: Upload Blob

This action uploads a blob to a specific container and path.

```
PUT /{container-name}/{blob-name}
```

Configure these parameters:

- `container-name` (path, required)
- `blob-name` (path, required)
- `x-ms-blob-type` header set to `BlockBlob`
- `x-ms-version` header set to `2023-11-03`
- Request body: binary content

### Action 3: Download Blob

```
GET /{container-name}/{blob-name}
```

Parameters are the container name and blob name as path parameters, plus the API version header.

## Step 5: Handle the x-ms-version Header

Azure Blob Storage requires the `x-ms-version` header on every request. Rather than setting it per action, you can use a policy template in the custom connector definition. Here is the policy XML that adds the header to every request:

```xml
<!-- Policy to inject the API version header on all outbound requests -->
<set-header name="x-ms-version" exists-action="override">
    <value>2023-11-03</value>
</set-header>
```

You can add this in the connector's OpenAPI definition under the `x-ms-connector-metadata` section if you are editing the raw swagger file.

## Step 6: Test the Connector

After saving the connector, create a new connection:

1. Click Test on the connector page.
2. Click New connection.
3. You will be redirected to Azure AD to sign in and consent.
4. After consent, you are redirected back to Power Apps.

Test each action:

- For List Blobs, provide a container name and verify you get an XML response with blob names.
- For Upload Blob, provide a container name, blob name, and some content.
- For Download Blob, retrieve the blob you just uploaded.

## Step 7: Use the Connector in a Canvas App

Once the connector is working, you can use it in a Canvas App. Here is a typical pattern for listing blobs and displaying them in a gallery:

```
// Fetch blobs from the custom connector and store in a collection
// The ListBlobs action returns XML that Power Apps parses automatically
ClearCollect(
    colBlobs,
    MyBlobConnector.ListBlobs(
        "my-container",
        {prefix: "documents/"}
    )
);
```

For uploading, you might connect it to an attachment control:

```
// Upload each attachment from the attachment control to blob storage
// Loop through the Attachments collection and call the upload action
ForAll(
    AttachmentControl.Attachments,
    MyBlobConnector.UploadBlob(
        "my-container",
        ThisRecord.Name,
        ThisRecord.Value
    )
);
```

## Handling Token Refresh

OAuth 2.0 tokens expire. The custom connector framework handles token refresh automatically as long as your refresh URL is configured correctly. If you are seeing 401 errors after the token expires, double-check that:

- The Refresh URL matches the Token URL.
- The app registration has not had its secret expire.
- The `offline_access` scope is included if you need long-lived refresh tokens.

## Common Pitfalls

**CORS errors in testing**: The custom connector runs server-side in the API Management layer, so CORS is not an issue during actual use. But if you test with tools like Postman, make sure CORS is configured on your storage account.

**XML vs JSON responses**: Azure Blob Storage returns XML by default. Power Apps can parse this, but you may want to convert it to JSON using a Power Automate flow if the parsing is awkward.

**Shared Access Signatures as a fallback**: If OAuth 2.0 is too complex for your scenario, you can generate SAS tokens in a Power Automate flow and use them directly. But for enterprise scenarios, OAuth 2.0 with Azure AD is the recommended pattern.

**Storage firewall rules**: If your storage account restricts network access, make sure the Power Platform IP ranges are allowed. Microsoft publishes these IP ranges, and they change periodically.

## Security Considerations

Using OAuth 2.0 with Azure AD gives you several security benefits over shared access keys:

- Tokens are scoped to specific permissions and expire automatically.
- You can use Conditional Access policies to restrict who can obtain tokens.
- Audit logs in Azure AD track who accessed the storage account and when.
- No secrets are stored in the Power App itself since the connector framework manages tokens.

For production deployments, consider using a managed identity or certificate-based authentication on the app registration rather than a client secret. This reduces the risk of secret leakage.

## Wrapping Up

Building a custom Power Apps connector for Azure Blob Storage with OAuth 2.0 gives you full control over blob operations while maintaining enterprise-grade security. The process involves registering an Azure AD application, configuring the connector with OAuth 2.0 settings, defining your API actions, and testing the connection. Once set up, your Canvas Apps and Power Automate flows can interact with Azure Blob Storage without exposing any access keys.
