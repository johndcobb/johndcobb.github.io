---
layout: page
permalink: /organizing/
title: Organizing
class: projects
---

{:.hidden}
# Organizing

{:.lead}


<div class="grid">
  {% for project in site.data.organizing %}
    {% if project.panel==nil %}
      {% include project.html project=project %}
    {% endif %}
  {% endfor %}
</div>
