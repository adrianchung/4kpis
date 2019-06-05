#!/usr/bin/env ts-node

import JiraApi from 'jira-client';
import { average, min } from 'simple-statistics';
import prettyMilliseconds from 'pretty-ms';
import readlineSync from 'readline-sync';
import { ArgumentParser } from 'argparse';

const parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Calculate lead times for your project in JIRA'
});
parser.addArgument(['-K', '--key'], { help: 'Project key', required: true });
parser.addArgument(['-S', '--start'], { help: 'Start date in yyyy-mm-dd format, inclusive', required: true });
parser.addArgument(['-E', '--end'], { help: 'End date in yyyy-mm-dd format, exclusive', required: true });
parser.addArgument(['-H', '--host'], { help: 'JIRA host, example mydomain.atalassian.com', required: true});
parser.addArgument(['-U', '--username'], { help: 'Your JIRA username', required: true });

const args = parser.parseArgs();
const projectId = args.key;
const startDate = args.start;
const endDate = args.end;
const host = args.host;
const username = args.username;

const password = readlineSync.question('Enter password: ', {
  hideEchoBack: true
});

const jiraClient: JiraApi = new JiraApi({
  protocol: 'https',
  host: host,
  username: username,
  password: password,
  apiVersion: '2',
  strictSSL: true
});

const asyncFunction = async () => {
  try {
    const response: JiraApi.JsonResponse = await jiraClient.getAllVersions('155', 0, 10, "true");
    const releasesInMonth = response.values.filter((release: any) => release.releaseDate < endDate && release.releaseDate >= startDate)

    // console.log(response);
    // console.log(releasesInMonth);
    const averageCreatedToDoneLeadTimes: number[] = [];
    const averageDoneToReleaseLeadTimes: number[] = [];
    for (const release of releasesInMonth) {
      // Release dates in JIRA only have start of day, so assume we release next day
      const releaseDate: Date = new Date(new Date(release.releaseDate).getTime() + (1000 * 60 * 60 * 24)); 
      console.log(`\n=== RELEASE ${release.name} on ${releaseDate} ===`);

      // console.log(release.name);
      const issues = await jiraClient.searchJira(`project = ${projectId} AND fixVersion = ${release.name}`, { fields: [ 'created' ]});
      
      // console.log(issues.issues.map((issue: any) => issue));
      const doneDates: Date[] = [];
      for (const issue of issues.issues) {
        const minDates: Date[] = [];
        const histories = (await jiraClient.findIssue(issue.key, "changelog")).changelog.histories;
        histories.forEach((h: any) => {
          for (const historyItem of h.items) {
            if (historyItem.field === 'status' && (historyItem.toString === 'Done' || historyItem.toString === 'Closed')) {
              const temp = new Date(h.created);
              if (+releaseDate >= +temp) { // We want to filter out anything that closes after the release date
                minDates.push(temp);
              }
            }
          }
        });
        if (minDates.length > 0) {
          doneDates.push(new Date(min(minDates.map(d => +d))));
        }
      }

      console.log('Dates marked done or closed (min of the two):');
      console.log(doneDates);

      const doneDifferences = doneDates.map((d: Date) => (+releaseDate - +d)); // The + coerces to a number
      const avgDoneToRelease = average(doneDifferences);
      console.log(`Lead time of ${prettyMilliseconds(avgDoneToRelease)}`);
      averageDoneToReleaseLeadTimes.push(avgDoneToRelease);
      // console.log(doneDates);

      const dates: Date[] = issues.issues.map((issue: any) => new Date(issue.fields.created));
      const differences = dates.map((d: Date) => (+releaseDate - +d)); // The + coerces to a number
      const avg = average(differences);
      console.log(`Created to done lead time of ${prettyMilliseconds(avg)}`);

      averageCreatedToDoneLeadTimes.push(avg);
    }
    
    console.log(`\nAverage done to release lead time is: ${prettyMilliseconds(average(averageDoneToReleaseLeadTimes))}`);
    console.log(`Average created to release lead time is: ${prettyMilliseconds(average(averageCreatedToDoneLeadTimes))}`);
  }
  catch(err) {
    console.log('Error: ', err.message);
  }
};
asyncFunction();