-- Add Jira mapping fields to existing tables (idempotent)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tareas' AND column_name='jira_issue_id') THEN
    ALTER TABLE tareas ADD COLUMN jira_issue_id VARCHAR(255);
    ALTER TABLE tareas ADD COLUMN jira_issue_key VARCHAR(255);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proyectos' AND column_name='jira_epic_id') THEN
    ALTER TABLE proyectos ADD COLUMN jira_epic_id VARCHAR(255);
    ALTER TABLE proyectos ADD COLUMN jira_epic_key VARCHAR(255);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sprints' AND column_name='jira_sprint_id') THEN
    ALTER TABLE sprints ADD COLUMN jira_sprint_id VARCHAR(255);
  END IF;
END $$;
