CREATE TABLE tickets_plan_lab (
    ticket_id Uint64 NOT NULL,
    assignee Utf8,
    status Utf8,
    summary Utf8,
    INDEX by_assignee GLOBAL SYNC ON (assignee) COVER (status, summary),
    PRIMARY KEY (ticket_id)
);
