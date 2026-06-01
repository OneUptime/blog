# How to Build a Custom Power Apps Connector for Azure Blob Storage with OAuth

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
4. You can skip the Redirect URI for now. After you create and save the custom connector, Power Apps shows a connector-specific Redirect URL on the Security tab. Add that exact URL to the app registration as a Web redirect URI.
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

Finally, make sure the signed-in users who will use the connector have Azure RBAC permissions on the storage account or container, such as Storage Blob Data Reader for read-only scenarios or Storage Blob Data Contributor for upload scenarios. The `user_impersonation` API permission lets the connector request a token, but Azure Storage still authorizes data operations with RBAC.

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
- Tenant ID: the Directory ID from your app registration
- Resource URL: `https://storage.azure.com/`

Use your actual Azure AD tenant ID rather than `common` so the connector requests tokens from the tenant that contains the storage account.

After you save the connector, copy the Redirect URL shown on the Security tab and add it to the app registration under Authentication > Web > Redirect URIs. For new custom connectors, this URL is usually connector-specific rather than the old global redirect URL.

## Step 4: Define Connector Actions

Now you define the API operations your connector will support. Here are three essential ones.

### Action 1: List Blobs

This action lists blobs in a container using the Azure Blob Storage REST API.

```text
GET /{container-name}?restype=container&comp=list&prefix={prefix}
```

Set the following parameters:

- `container-name` (path parameter, required)
- `prefix` (query parameter, optional)
- `x-ms-version` header set to `2023-11-03`

The response body is XML. If you want to use the result directly in a gallery, define the response schema carefully in the connector or transform the list response to JSON in Power Automate before returning it to Power Apps.

### Action 2: Upload Blob

This action uploads a blob to a specific container and path.

```text
PUT /{container-name}/{blob-name}
```

Configure these parameters:

- `container-name` (path, required)
- `blob-name` (path, required)
- `x-ms-blob-type` header set to `BlockBlob`
- `x-ms-version` header set to `2023-11-03`
- Request body: binary content

### Action 3: Download Blob

```text
GET /{container-name}/{blob-name}
```

Parameters are the container name and blob name as path parameters, plus the API version header.

## Step 5: Handle the x-ms-version Header

Azure Blob Storage requires the `x-ms-version` header on authorized requests. Rather than setting it per action, you can use the Set HTTP header policy template in the custom connector definition. Configure the policy like this:

```text
Template: Set HTTP header
Header name: x-ms-version
Header value: 2023-11-03
Action if header exists: override
Run policy on: Request
```

In the custom connector wizard, add this under Definition > New policy. If you are editing exported connector files, policy template instances are stored in the connector properties rather than as raw Azure API Management policy XML in the OpenAPI paths.

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

```text
// Fetch blobs from the custom connector and store in a collection
// The ListBlobs action should return a schema that Power Apps can collect
ClearCollect(
    colBlobs,
    MyBlobConnector.ListBlobs(
        "my-container",
        {prefix: "documents/"}
    )
);
```

For uploading, you might connect it to an attachment control:

```text
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

OAuth 2.0 tokens expire. The custom connector framework handles token refresh automatically when the OAuth settings are configured correctly. If you are seeing 401 errors after the token expires, double-check that:

- If you are using Generic OAuth instead of the Azure Active Directory identity provider, the Refresh URL matches the Token URL.
- The app registration has not had its secret expire.
- The `offline_access` scope is included if you need long-lived refresh tokens.

## Common Pitfalls

**CORS errors in testing**: The custom connector runs server-side in the API Management layer, so CORS is not an issue during actual use. But if you test with tools like Postman, make sure CORS is configured on your storage account.

**XML vs JSON responses**: Azure Blob Storage returns XML for List Blobs. For Power Apps, the easiest pattern is often to define a connector response that exposes a predictable schema or convert the response to JSON using a Power Automate flow if XML handling is awkward.

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
