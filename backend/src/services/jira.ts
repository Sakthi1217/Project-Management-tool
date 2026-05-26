const JIRA_HOST = process.env.JIRA_HOST;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const getAuthHeader = () => {
  return `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
};

/**
 * Creates a new issue in Jira
 */
export async function createJiraIssue(summary: string, description: string, epicKey?: string) {
  if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) return null;

  // Assuming a default project key of 'PPAI' for this integration if not specified
  // In a real robust system, we would query the user's Jira projects or store the Jira project key in our DB.
  // For now, we will create a standard Task issue.
  
  // NOTE: This requires a Jira Project Key. We will default to the first project in the user's Jira.
  const projectsRes = await fetch(`${JIRA_HOST}/rest/api/3/project`, {
    headers: { 'Authorization': getAuthHeader(), 'Accept': 'application/json' }
  });
  const projects = await projectsRes.json() as any[];
  if (!projects || projects.length === 0) return null;
  const projectKey = projects[0].key;

  const body: any = {
    fields: {
      project: { key: projectKey },
      summary: summary,
      description: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: description || 'Created from PP-AI' }] }]
      },
      issuetype: { name: 'Task' }
    }
  };

  if (epicKey) {
    body.fields.customfield_10014 = epicKey; // standard epic link field
  }

  const res = await fetch(`${JIRA_HOST}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error('Failed to create Jira issue:', await res.text());
    return null;
  }

  return await res.json() as { id: string; key: string; self: string };
}

/**
 * Syncs the progress percentage to Jira by adding a comment or transitioning
 * Since Jira doesn't have a native % field for basic tasks, we transition to In Progress / Done
 */
export async function updateJiraIssueProgress(issueKey: string, progress: number) {
  if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN || !issueKey) return;

  // Fetch transitions
  const transitionsRes = await fetch(`${JIRA_HOST}/rest/api/3/issue/${issueKey}/transitions`, {
    headers: { 'Authorization': getAuthHeader(), 'Accept': 'application/json' }
  });
  
  if (!transitionsRes.ok) return;
  const data = await transitionsRes.json() as any;
  const transitions = data.transitions || [];

  let targetStatus = '';
  if (progress === 100) targetStatus = 'Done';
  else if (progress > 0) targetStatus = 'In Progress';
  else targetStatus = 'To Do';

  const targetTransition = transitions.find((t: any) => t.to.name.toLowerCase() === targetStatus.toLowerCase());
  
  if (targetTransition) {
    await fetch(`${JIRA_HOST}/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transition: { id: targetTransition.id } })
    });
  }
}

/**
 * Fetch workload for the dashboard
 */
export async function getTeamWorkload() {
  if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) return [];

  // JQL to get all non-done issues (works for both classic and next-gen projects)
  const jql = 'statusCategory != Done ORDER BY updated DESC';
  console.log('[Jira] Fetching workload with JQL:', jql);
  
  const res = await fetch(`${JIRA_HOST}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jql,
      maxResults: 50,
      fields: ['summary', 'status', 'assignee', 'priority', 'key']
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[Jira] Workload fetch failed:', res.status, errText);
    return [];
  }
  const data = await res.json() as any;
  console.log('[Jira] Response keys:', Object.keys(data));
  console.log('[Jira] Full response (first 500 chars):', JSON.stringify(data).substring(0, 500));
  
  // The new /search/jql endpoint may return issues differently
  const issues = data.issues || [];
  console.log('[Jira] Found', issues.length, 'issues');
  
  if (issues.length === 0) return [];
  
  // Log the first issue structure to debug field access
  console.log('[Jira] First issue keys:', Object.keys(issues[0]));
  
  return issues.map((issue: any) => {
    try {
      return {
        id: issue.id,
        key: issue.key,
        summary: issue.fields?.summary || issue.summary || 'No summary',
        status: issue.fields?.status?.name || issue.status?.name || 'Unknown',
        assignee: issue.fields?.assignee?.displayName || issue.assignee?.displayName || 'Unassigned',
        assigneeEmail: issue.fields?.assignee?.emailAddress || issue.assignee?.emailAddress || null,
        priority: issue.fields?.priority?.name || issue.priority?.name || 'Medium'
      };
    } catch (e) {
      console.error('[Jira] Error mapping issue:', issue.id, e);
      return null;
    }
  }).filter(Boolean);
}
