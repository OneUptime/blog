# How to Customize the Azure API Management Developer Portal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, Developer Portal, API Documentation, Customization, Cloud

Description: A hands-on guide to customizing the Azure API Management developer portal with branding, custom pages, and authentication providers.

---

The Azure API Management developer portal is a fully customizable website that serves as the front door for your API consumers. Out of the box, it provides API documentation, interactive test consoles, subscription management, and user authentication. But the default portal looks generic, and if you are running an API program, you want it to match your brand and include content specific to your platform.

In this post, I will walk through the practical steps of customizing the developer portal - from basic branding to adding custom pages, configuring authentication, and deploying a self-hosted version when you need full control.

## Accessing the Portal Editor

Navigate to your APIM instance in the Azure Portal and click "Developer portal" in the left menu. You will see two options:

- **Developer portal**: Opens the portal editor in admin mode
- **Developer portal (legacy)**: The old portal that Microsoft is deprecating. Ignore this.

Click "Developer portal" to open the visual editor. You are now in the admin view where you can modify the portal's layout, content, and styling.

## Branding and Styling

The first thing most teams do is update the branding. Click the paintbrush icon in the left toolbar to open the Styles panel. Here you can change:

- **Primary color**: Used for buttons, links, and accents
- **Font family**: The typeface used throughout the portal
- **Header background**: The color or gradient for the navigation bar

For more granular control, click "Custom CSS" and add your own stylesheet rules:

```css
/* Custom branding for the developer portal */
/* Override the default header styling with your brand colors */
:root {
    --portal-primary-color: #2563eb;
    --portal-font-family: 'Inter', sans-serif;
}

.nav-bar {
    background-color: #1e293b;
}

.nav-bar a {
    color: #e2e8f0;
}

/* Style the API operation cards */
.operation-card {
    border-left: 3px solid var(--portal-primary-color);
    margin-bottom: 1rem;
}
```

Upload your company logo by clicking the media icon and replacing the default logo. The logo appears in the navigation bar and the sign-in page.

## Customizing the Home Page

The home page is the first thing developers see. Click on any element to edit it directly. You can:

- Change the welcome text and hero section
- Add or remove content blocks (text, images, buttons)
- Rearrange sections by dragging them
- Add code samples or getting-started guides

A good home page for an API portal typically includes:

1. A brief description of what your APIs do
2. A "Get Started" button linking to documentation
3. Key statistics or feature highlights
4. Links to popular APIs

Here is an example structure that works well for most API portals:

**Hero Section**: "Build with [Company Name] APIs" with a brief tagline and a prominent sign-up button.

**Quick Start Section**: Three or four cards showing the most common use cases, each linking to the relevant API documentation.

**Code Sample Section**: A tabbed code block showing a simple API call in multiple languages (curl, Python, JavaScript, C#).

## Adding Custom Pages

Beyond the default pages (Home, APIs, Products, Applications), you can create custom pages for guides, tutorials, FAQs, or changelog notes.

Click the page icon in the left toolbar and click "Add page." Give it a URL slug and a title. Then use the visual editor to add content. You can include:

- Rich text blocks
- Code snippets with syntax highlighting
- Images and diagrams
- Embedded videos
- Links to API operations

Custom pages are great for:

- **Getting Started guides**: Step-by-step onboarding for new developers
- **Authentication guide**: Explain your OAuth flow, show how to get tokens
- **Changelog**: Document API changes and version history
- **SDKs and Libraries**: List your official SDKs with installation instructions
- **Status page**: Link to your OneUptime status page for API health monitoring

## Configuring Authentication Providers

By default, the developer portal uses a basic username/password registration. You can add OAuth 2.0 providers so developers can sign in with their existing identities.

Go to your APIM instance in the Azure Portal (not the developer portal editor), navigate to "Developer portal" > "Identities." You can add:

- **Azure Active Directory**: For enterprise developers in your organization
- **Azure AD B2C**: For external developers with self-service registration
- **Google**: Sign in with Google accounts
- **Microsoft Account**: Sign in with personal Microsoft accounts

For Azure AD, you need to register an application and provide the client ID, client secret, and tenant information. Here is the redirect URI format:

```
https://yourinstance.developer.azure-api.net/signin-aad
```

After configuring the provider, it appears as a sign-in option on the developer portal login page.

## Customizing Email Templates

When developers register, subscribe to products, or receive notifications, APIM sends emails. You can customize these templates under "Notification templates" in your APIM instance.

Each template supports HTML and a set of variables for dynamic content. For example, the "New developer account confirmation" template might include:

```html
<!-- Custom welcome email template -->
<!-- Variables like $DevFirstName are replaced with actual values -->
<html>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>Welcome to the [Company] Developer Platform</h2>
    <p>Hi $DevFirstName,</p>
    <p>Your account has been created. Click the link below to confirm your email:</p>
    <p><a href="$ConfirmUrl" style="color: #2563eb;">Confirm Email Address</a></p>
    <p>Once confirmed, you can explore our APIs and subscribe to products.</p>
    <p>Need help? Reach out to api-support@company.com</p>
</body>
</html>
```

## Restricting Portal Access

By default, anonymous users can browse the API documentation. If you want to require authentication before viewing any content, configure the portal's visibility settings:

1. In the portal editor, go to the site settings
2. Enable "Require user login" to make the entire portal require authentication
3. Alternatively, restrict specific pages by setting them to "Authenticated users only"

For APIs that should not be publicly visible, set their associated products to "Requires subscription" and limit the product visibility to specific groups.

## Self-Hosted Developer Portal

If the managed portal does not give you enough control, you can self-host the developer portal. The portal is an open-source React application that you can fork, modify, and deploy anywhere.

The repository is available on GitHub. To set it up:

```bash
# Clone the developer portal repository
git clone https://github.com/Azure/api-management-developer-portal.git
cd api-management-developer-portal

# Install dependencies
npm install

# Configure the connection to your APIM instance
# Edit the src/config.json file with your APIM details

# Start the development server
npm start
```

With the self-hosted version, you can:

- Add completely custom React components
- Integrate with your existing design system
- Embed the portal into your main website
- Add custom business logic (analytics, A/B testing, feature flags)
- Control the deployment pipeline

The tradeoff is that you are now responsible for hosting, updating, and maintaining the portal. Microsoft publishes updates to the managed portal automatically, but you will need to merge upstream changes manually in the self-hosted version.

## Publishing Changes

This is a step that trips people up. After making changes in the portal editor, you must explicitly publish them. Changes made in the editor are saved as drafts and are not visible to developers until you publish.

Click the "Publish" button in the top toolbar of the editor. This pushes all draft changes to the live portal. The publication is atomic - all changes go live at once.

If you want to preview changes before publishing, open the portal URL in an incognito window. Draft changes are only visible in the editor; the public portal shows the last published version.

## Adding API Documentation Enhancements

The portal auto-generates API documentation from your APIM API definitions. But you can enhance it:

1. **Add descriptions to operations**: In the APIM API definition, add detailed descriptions to each operation. These show up in the portal documentation.
2. **Include request/response examples**: Define sample payloads in your API schema. The portal displays them in the documentation.
3. **Add operation tags**: Group related operations with tags for easier navigation.
4. **Write API-level descriptions**: Each API can have a markdown description that appears at the top of its documentation page.

## Monitoring Portal Usage

Enable Application Insights on the developer portal to track:

- Which APIs developers view most
- Where developers drop off in the registration flow
- Which code samples are copied most frequently
- Search queries (what are developers looking for?)

This data helps you improve the portal experience and identify gaps in your documentation.

## Summary

The Azure API Management developer portal is your API's storefront. Invest time in customizing it with your branding, adding helpful content like getting-started guides, configuring easy authentication, and keeping the documentation complete and current. A well-designed developer portal reduces support tickets, accelerates developer onboarding, and makes your API program look professional. Start with the managed portal, customize it through the visual editor, and move to self-hosted only if you need capabilities beyond what the editor provides.
