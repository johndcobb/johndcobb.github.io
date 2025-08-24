---
layout: page
permalink: /organizing/
title: Organizing
class: talks
---

{:.hidden}
# Organizing

## Conferences and Seminars
{% assign conferences = site.data.organizing | where_exp:"activity", "activity.type == 'Conference' or activity.type == 'Special Session'" %}
{% for conference in conferences %}

<div class="no-skip">
<div style="margin-left: 90px"> 
<h5>{% if conference.shorttitle %}{{ conference.shorttitle }}{% else %}{{ conference.title }}{% endif %} {% if conference.url %}
    <a href="{{ conference.url }}" style="font-size: 0.75em; margin-left: 15px">
      <i class="fas fa-link" aria-hidden="true"></i> Website
    </a>
    {% endif %} </h5>
</div>

<div class ="date-container">
<span class="date"> {{ conference.dates }}</span>
<span class="fill" style = "flex:1" >{{ conference.description }}{% if conference.numparticipants %} (~{{ conference.numparticipants }} participants){% endif %}</span>
<span class="right">{{ conference.location }}</span>
</div>
</div>

{% endfor %}

## Reading Groups and Special Sessions
{% assign conferences = site.data.organizing | where_exp:"activity", "activity.type == 'Reading Group' or activity.type == 'Seminar' or activity.type =='Service'" %}
{% for conference in conferences %}

<div class="no-skip">
<div style="margin-left: 90px"> 
<h5>{% if conference.shorttitle %}{{ conference.shorttitle }}{% else %}{{ conference.title }}{% endif %} {% if conference.url %}
    <a href="{{ conference.url }}" style="font-size: 0.8em; margin-left: 15px">
      <i class="fas fa-link" aria-hidden="true"></i> Website
    </a>
    {% endif %} </h5>
</div>

<div class ="date-container">
<span class="date"> {{ conference.dates }}</span>
<span class="fill">{{ conference.description }}</span>
<span class="right">{{ conference.location }}</span>
</div>
</div>

{% endfor %}
