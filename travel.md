---
layout: page
permalink: /travel/
title: Travel
class: home
---

{:.hidden}
# Travel

<div class="travel" markdown="1">
<table>
<tbody>
{% assign future_travel = site.data.travel | where_exp:'item','item.start == null' %}
{% for travel in future_travel %}
  {% include travel.html travel=travel %}
{% endfor %}
{% assign sorted_travel = site.data.travel | where_exp:'item','item.start' | sort: 'start' | reverse %}
{% for travel in sorted_travel %}
  {% include travel.html travel=travel %}
{% endfor %}
</tbody>
</table>
</div>

<iframe src="/assets/travelmap.html" width="640" height="480"></iframe>