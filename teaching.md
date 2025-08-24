---
layout: page
permalink: /teaching/
title: Teaching
class: talks
---

{:.hidden}
# Teaching {#teaching}


{% comment %} Note that the data type is strange, each entry of coursetitles is an array containing items of the form {name: title}{items: an array of all the courses with that title} {% endcomment %}
{% assign coursetitles = site.data.teaching | group_by:"title" %}
{% for coursetitle in coursetitles %}
### {{ coursetitle.name }}
<div class="no-skip">
{% for course in coursetitle.items %}
<div class ="date-container">
<span class="date"> {{ course.year }} </span>
<span class="fill">{{ course.role }} {% if course.coursenum %}({{course.coursenum}}){% endif%} {% if course.url %}
    <a href="{{ course.url }}" style="font-size: 0.8em; margin-left: 15px">
      <i class="fas fa-link" aria-hidden="true"></i> Website
    </a>
    {% endif %}</span>
<span class="right">{{ course.location }}</span>
</div> 

{% endfor %}</div>
{% endfor %}


{% comment %}
{% for title in talktitles %}{% if title.items[0].hide == nil %}
{:.talk-title}
### {{ title.name }}
{% assign sorted_talks = title.items | sort: 'date' | reverse %}
{% for talk in sorted_talks  %}
  {% include talk.html talk=talk %}
{% endfor %}
{% endif %}{% endfor %}
{% comment %} 
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
{% endcomment %}
{% endcomment %}