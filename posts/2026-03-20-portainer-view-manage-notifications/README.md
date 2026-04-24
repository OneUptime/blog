# How to View and Manage Notifications in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Notification, UI, Administration, Event, Docker

Description: Learn how to view, manage, and clear notifications in Portainer, including understanding notification types and configuring alert preferences.

---

Portainer keeps a record of the notification messages you receive in the UI - the popup messages that appear in the top right of the interface. The 50 most recent notifications are accessible from the notification bell, and the full Notifications page lets you search and remove stored notification records.

## Accessing Notifications

Click the bell icon in the top right of the Portainer UI to open the notification menu. When notifications are present, the bell shows a red indicator. The menu shows up to 50 recent notifications and includes a link to view all notifications.

## Notification Types

| Type | Trigger |
|---|---|
| Success | A Portainer action completed successfully |
| Warning | Portainer displayed a non-fatal warning |
| Error | A Portainer action failed or returned an error |

## Viewing Notification Details

On the Notifications page, each notification shows:

- **Type**: Success, warning, or error
- **Title**: The notification title
- **Details**: The message body
- **Time**: When the notification was created

## Opening Notifications from the Menu

Portainer notifications do not have a read/unread state or a **Mark all as read** option. Clicking a notification in the bell menu opens the full Notifications page and highlights that entry.

## Clearing Notifications

1. Open the notification menu from the bell icon.
2. Click **Clear all** to remove all stored notifications for your user.
3. To remove specific notification records, click **View all notifications**, select the entries, and delete them from the Notifications page.

## Notification Retention and Performance

A large notification backlog can affect Portainer's UI responsiveness. In high-activity environments, clear notifications regularly:

1. In Portainer go to the notification bell.
2. Click **Clear all**.

Portainer stores these notification records in the browser, so clearing them from the UI is the relevant cleanup step. Database compaction can reclaim Portainer database space, but it does not clear browser-stored notifications.

## Alert Notifications (Business Edition)

In Portainer Business Edition, administrators can configure alert notification channels through Alerting. After enabling **Observability** under **Settings > General > Additional functionality**:

1. Go to **Additional Functionality > Alerting**.
2. Open the **Settings** tab.
3. Click **Edit** on the `internal` instance, then click **Add Channel**.
4. Choose **Slack**, **Email**, **Webhook**, or **Microsoft Teams V2** and complete the channel settings.
5. Configure alert rules on the **Rules** tab to determine when notifications are sent.
