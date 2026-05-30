# Validation Summary: How to Use Database Mail in Azure SQL Managed Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Managed Instance
- SQL Server Database Mail
- SQL Server Agent
- Transact-SQL
- SMTP providers including SendGrid, Microsoft 365, Gmail, and Amazon SES

## Sources Consulted
- Microsoft Learn: Database Mail - https://learn.microsoft.com/en-us/sql/relational-databases/database-mail/database-mail
- Microsoft Learn: Configure Database Mail - https://learn.microsoft.com/en-us/sql/relational-databases/database-mail/configure-database-mail
- Microsoft Learn: sysmail_add_profile_sp - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sysmail-add-profile-sp-transact-sql
- Microsoft Learn: sysmail_add_principalprofile_sp - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sysmail-add-principalprofile-sp-transact-sql
- Microsoft Learn: sp_send_dbmail - https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-send-dbmail-transact-sql
- Microsoft Learn: Configure SQL Server Agent Mail to Use Database Mail - https://learn.microsoft.com/en-us/sql/relational-databases/database-mail/configure-sql-server-agent-mail-to-use-database-mail
- Microsoft Learn: How to set up a multifunction device or application to send email using Microsoft 365 or Office 365 - https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365
- Google Workspace Admin Help: Send email from a printer, scanner, or app - https://support.google.com/a/answer/176600
- AWS Documentation: Connecting to an Amazon SES SMTP endpoint - https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html
- Twilio SendGrid Docs: Integrating with the SMTP API - https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api

## Issues Found
- The post used a custom Database Mail profile name, `AlertsProfile`, throughout the Managed Instance setup. Microsoft documents that SQL Agent job email on Azure SQL Managed Instance can use only one Database Mail profile and it must be named `AzureManagedInstance_dbmail_profile`. Updated the profile creation, profile-account mapping, default profile grant, and all `sp_send_dbmail` examples to use the required profile name.
- The post said making the profile default lets any database user send mail without specifying a profile name. A public default profile is available broadly, but users must still be members of `DatabaseMailUserRole` in `msdb` to execute `sp_send_dbmail`. Updated the wording and added an `ALTER ROLE DatabaseMailUserRole ADD MEMBER` example.

## Review Notes
The remaining Database Mail stored procedure usage, `sp_configure` enablement steps, query attachment options, SMTP host/port examples, and troubleshooting queries align with current official documentation. SMTP provider authentication requirements can vary by tenant and account policy, especially for Microsoft 365 and Gmail, so production setups should verify SMTP AUTH, app password, or relay policy settings for the specific provider account.
