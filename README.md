4 KPIS Project
==============

A really hacky script (my foray into Typescript) to start calculating some lead times from our JIRA release process.
The definition I'm using here for lead time is from card 'Done' to the release date marked for a specific version.

There's a few things here that will skew the results. Specifically, release dates in JIRA do now have hours or minutes
associated with it, so the time is set to be the next day so that day-of cards get included in the calculation. This will
cause lead times to skew slightly high. 

It also assumes that a 'Done' JIRA card means developer complete. The time between 'Done' to release is what we're really after,
so it averages out those times for cards in a given release. 

Yes, it's a 4 KPIs project, but I really only have one KPI. I'll circle back to calculate the other KPIs at a later point 
in time. 