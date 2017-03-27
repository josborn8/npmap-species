from django.http import HttpResponse, Http404
from django.conf import settings
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.gzip import gzip_page

import os
from Naked.toolshed.shell import muterun_js


@require_GET
@gzip_page
def index(request):
	context = {
		'DEBUG': settings.DEBUG,
	}

	return render(request, 'index.html', context=context)


@require_POST
@gzip_page
def mds(request):
	try:
		sim_type = request.POST.get('type')
		if sim_type is None:
			sim_type = 'ssi'

		response = muterun_js('mds.js')

		if len(response.stderr) != 0 or len(response.stdout) == 0:
			try:
				pathname = os.path.join(settings.STATICFILES_DIRS[0], 'data/sim_coords.json')
				sim_coords_data = open(pathname, 'rb')
			except:
				raise
		else:
			sim_coords_data = response.stdout

		response = HttpResponse(content=sim_coords_data)
		response['Content-Type'] = 'application/json'
		return response
	except:
		raise Http404('File does not exist')
