---
layout: page
permalink: /organizing/
title: Organizing
class: talks organizing
---

# Organizing

## Conferences and Seminars
{% assign conferences = site.data.organizing | where_exp:"activity", "activity.type == 'Conference' or activity.type == 'Special Session' or activity.type == 'Seminar'" %}
{% for conference in conferences %}

<div class="no-skip">
<div class="organizing-title"> 
<h5>{% if conference.shorttitle %}{{ conference.shorttitle }}{% else %}{{ conference.title }}{% endif %} {% if conference.url %}
    <a href="{{ conference.url }}" class="organizing-link">
      <i class="fas fa-link" aria-hidden="true"></i> Website
    </a>
    {% endif %} </h5>
</div>

<div class ="date-container">
<span class="date"> {{ conference.dates }}</span>
<span class="right">{{ conference.location }}</span>
<span class="fill">{{ conference.description }}{% if conference.numparticipants %} {% if conference.grant %} Supported by 
<a href="{{ conference.link }}"> {{ conference.grant }}. </a> {% endif %} (~{{ conference.numparticipants }} participants){% endif %}</span>
</div>
</div>

{% endfor %}

## Reading Groups
{% assign conferences = site.data.organizing | where_exp:"activity", "activity.type == 'Reading Group'" %}
{% for conference in conferences %}

<div class="no-skip">
<div class="organizing-title"> 
<h5>{% if conference.shorttitle %}{{ conference.shorttitle }}{% else %}{{ conference.title }}{% endif %} {% if conference.url %}
    <a href="{{ conference.url }}" class="organizing-link">
      <i class="fas fa-link" aria-hidden="true"></i> Website
    </a>
    {% endif %} </h5>
</div>

<div class ="date-container">
<span class="date"> {{ conference.dates }}</span>
<span class="right">{{ conference.location }}</span>
<span class="fill">{{ conference.description }}</span>
</div>
</div>

{% endfor %}

## Outreach
{% assign conferences = site.data.organizing | where_exp:"activity", "activity.type == 'Seminar' or activity.type =='Service'" %}
{% for conference in conferences %}

<div class="no-skip">
<div class="organizing-title"> 
<h5>{% if conference.shorttitle %}{{ conference.shorttitle }}{% else %}{{ conference.title }}{% endif %} {% if conference.url %}
    <a href="{{ conference.url }}" class="organizing-link">
      <i class="fas fa-link" aria-hidden="true"></i> Website
    </a>
    {% endif %} </h5>
</div>

<div class ="date-container">
<span class="date"> {{ conference.dates }}</span>
<span class="right">{{ conference.location }}</span>
<span class="fill">{{ conference.description }}</span>
</div>
</div>

{% endfor %}
