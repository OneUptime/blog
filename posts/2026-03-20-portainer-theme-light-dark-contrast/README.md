# How to Change the Theme (Light/Dark/High-Contrast) in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, UI, Themes, Accessibility, Dark Mode, Configuration, User Setting

Description: Learn how to switch between Portainer's light, dark, and high-contrast themes in the user settings for improved readability and accessibility.

---

Portainer lets you choose between Light Theme, Dark Theme, High Contrast, and System Theme. Each user can set their own theme preference independently, stored in their profile. The setting applies to the current logged-in user only.

## Changing Your Theme

1. Log in to Portainer.
2. Click your username in the top-right corner.
3. Select **My account**.
4. Scroll to the **User theme** section.
5. Choose **Light Theme**, **Dark Theme**, **High Contrast**, or **System Theme**.
6. The theme applies immediately - no save button required.

## Theme Options

| Theme | Best For |
|---|---|
| **Light Theme** | Well-lit environments, printing |
| **Dark Theme** | Low-light environments |
| **High Contrast** | Stronger contrast and clearer separation between UI elements |
| **System Theme** | Following your operating system's light/dark preference automatically |

## Persisting Theme Across Sessions

The theme selection is saved in Portainer's database against your user account. It persists across:

- Browser refreshes
- Logouts and logins
- Different devices (the setting is stored per user account, though System Theme still follows each device's OS preference)

## Updating a User Theme via the API

Admins can update a user's theme via the API, and regular users can update their own account the same way:

```bash
# Get a JWT token

TOKEN=$(curl -sk -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Update user ID 1's theme
curl -sk -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://localhost:9443/api/users/1 \
  -d '{"Theme":{"color":"dark"}}'
```

Replace `1` with the user ID you want to update.

Valid values for `color` are: `"light"`, `"dark"`, `"highcontrast"`, `"auto"`.

## System Theme

Selecting **System Theme** in Portainer makes the UI follow your operating system's light/dark mode preference:

```javascript
// Portainer reads this media query to determine auto theme
window.matchMedia('(prefers-color-scheme: dark)').matches
// true → dark mode applied
// false → light mode applied
```

## High Contrast Mode

High Contrast mode uses a higher-contrast palette to make interface elements easier to distinguish. It can be helpful for:

- Users who prefer stronger contrast
- Bright screen environments
- Situations where clearer separation between interface elements improves readability
