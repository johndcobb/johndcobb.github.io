---
layout: page
permalink: /projects/
title: Projects
class: projects
---

{:.hidden}
# Projects

{:.lead}

<div class="grid">
  {% for project in site.data.projects %}
    {% if project.panel==nil %}
      {% include project.html project=project %}
    {% endif %}
  {% endfor %}
</div>
