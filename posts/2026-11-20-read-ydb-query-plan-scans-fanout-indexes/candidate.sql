SELECT ticket_id, status, summary
FROM tickets_plan_lab VIEW by_assignee
WHERE assignee = 'demo-user'
ORDER BY ticket_id
LIMIT 20;
