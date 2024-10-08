---
layout: page
permalink: /teaching/
title: Teaching
class: projects
---

{:.hidden}
# Teaching {#teaching}

{% assign coursetypes = site.data.teaching | where: "panel", "true" | group_by:"type" %} 
{% comment %} This tells us if the course is Current or Past {% endcomment %}
{% for type in coursetypes %} 
{% comment %} Note that the data type is strange, each entry of coursetitles is an array containing items of the form {name: title}{items: an array of all the courses with that title} {% endcomment %}
### {{ type.name }} 
{% assign coursetitles = type.items | group_by:"title" %} {% comment %} I only want to show one panel per unique course, so group by course title {% endcomment %}
<div class="grid" markdown="1">
{% for course in coursetitles %} 
{:.lead}
{% comment %} Now for each course in course titles, {% endcomment %}
  {% assign project = course.items[0] %}  
  {% comment %} Pick the most recent course. {% endcomment %}
  {% include project.html project=project %} 
  {% comment %} I want the link to go to the most recent course, and there to be a button on THAT page that allows people to access previous year pages. {% endcomment %}
{% endfor %}
</div>
{% endfor %}