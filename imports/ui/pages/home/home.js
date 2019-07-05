import './home.html'

import { startWork, pauseWork, continueWork, finishWork, deleteWork, calcDashboard } from '/imports/api/timesheet/methods'
import { Timesheet } from '/imports/api/timesheet/timesheet'
import { notify } from '/imports/modules/notifier.js'
import { hideConfirmationModal } from '/imports/api/users/methods'

import moment from 'moment'
import swal from 'sweetalert'

const formatDuration = (duration) => {
	const pad = val => val < 100 ? ('00' + val).slice(-2) : val

	return `${pad((duration.days() * 24) + duration.hours())}:${pad(duration.minutes())}:${pad(duration.seconds())}`
}

export { formatDuration }


Template.home.onCreated(function() {
    this.autorun(() => {

        this.subscribe('timesheet.all');

        //method call to calculate dashboard counts, I have used a method instead of pubs to improve performance
        //method needs to be in the autorun so it's executed once the user logs in
        if (Meteor.userId()) {
            calcDashboard.call({}, (err, data) => {
                if (!err) {
                    this.calcDashboard.set(data)
                } else {
                    notify(err.reason || err.message, 'error')
                }
            })
        }

    })

    this.timer = new ReactiveVar(new Date().getTime())
    this.calcDashboard = new ReactiveVar()


    Meteor.setInterval(() => this.timer.set(new Date().getTime()), 1000)
})

Template.home.helpers({
	removeHostname: (url) => {
			return url.replace(/http(s|):\/\/github.com\/(blockrazor)\//i, '')
	},
	dashboardCounts: () =>{
		return Template.instance().calcDashboard.get();
	},
	totalEarnings: () => {
		let sum = Timesheet.find({ owner: Meteor.userId(), paymentId: {$exists: false} }).fetch()
		
		return sum.map(v => v.totalEarnings ? v.totalEarnings : 0 ).reduce(
			(acc, curr) => acc + curr, 0
		)
	},
	timesheets: () => Timesheet.find({
		owner: Meteor.userId()
	}, {
		sort: {
			start: -1
		}
	}),
	total: () => {
		let total = Timesheet.find({
			owner: Meteor.userId(),
			active: false,
			paymentId: {$exists: false}
		}).fetch()

		let active = Timesheet.findOne({
			owner: Meteor.userId(),
			active: true,
			paymentId: {$exists: false}
		})

		let user = Meteor.users.findOne({
			_id: Meteor.userId()
		}) || {}

		let duration = total.reduce((i1, i2) => i1 + i2.totalTime, 0)

		if (active) {
			duration += (Template.instance().timer.get() - active.startTime) + (active.totalTime || 0)
		}

		let dec = duration / (1000 * 60 * 60)

		return {
			formattedTime: formatDuration(moment.duration(duration)),
			decimalTime: dec,
			earnings: dec * ((user.profile) || {}).hourlyRate || 0
		}
	},
	totalTime: function () {
		let duration

		if (this.active) {
			duration = moment.duration((Template.instance().timer.get() - this.startTime) + (this.totalTime || 0))
		} else {
			duration = moment.duration(this.totalTime)
		}

		return formatDuration(duration)
	},
	formatDate: (date) => {
		return moment(date).format('DD/MM/YY HH:mm:ss')
	},
	fixed: val => val ? val.toFixed(2) : '0.00',
	paid: function() {
		return this.status === 'payment-paid'
	},
	pending: function() {
		return this.status === 'payment-inprogress'
	},
	rejected: function() {
		return this.status === 'payment-rejected'
	},
	canEdit: function() {
		return ~['payment-paid', 'payment-rejected', 'payment-inprogress'].indexOf(this.status)
	},
	isAnyActive: () => {
		const activeSheet = Timesheet.find({
			owner: Meteor.userId(),
			active: true,
		}).fetch();

		return activeSheet ? activeSheet.length > 0 : false;
	},
})

Template.home.events({
	'click #js-start': (event, templateInstance) => {
		event.preventDefault()

		startWork.call({
			issue: $('#js-issue').val()
		}, (err, data) => {
			if (err) {
				notify(err.reason || err.message, 'error')
				$('#js-issue').val(''); //clear the issue input as the supplied data is invalid
			}else{
				$('#js-issue').val(''); //clear the input if succesfull
			}
		})
	},
	'click #js-pause': function (event, templateInstance) {
		event.preventDefault()

		pauseWork.call({
			workId: this._id
		}, (err, data) => {
			if (err) {
				notify(err.reason || err.message, 'error')
			}
		})
	},
	'click #js-continue': function (event, templateInstance) {
		event.preventDefault()

		continueWork.call({
			workId: this._id
		}, (err, data) => {
			if (err) {
				notify(err.reason || err.message, 'error')
			}
		})
	},
	'click #js-finish': function (event, templateInstance) {
		event.preventDefault()
		
		swal({
			title: 'Enter the link to PR',
      type: 'warning',
      content: "input",
      button: {
        text: "Finish!",
        closeModal: false,
      },
		}).then((url) => {
			var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
      var regex = new RegExp(expression);
      // check if it is a URL using regex
      if (url !== '-')  {
        if (url.match(regex)) {
          return url
        } else {
          swal("Oh no!", "PR link is invalid", "error")
          swal.stopLoading()
        }
        // return new Error;
      } if (url === '-') {
        return url;
      }
		}).then((val) => {
      if (val) {
				finishWork.call({
					workId: this._id,
					pr: val
				}, (err, data) => {
					if (err) {
						notify(err.reason || err.message, 'error')
					} else {
            swal("Good job!", "You have finished this issue!", "success");
          }
				})
			}
    }).catch(err => {
      if (err) {
        swal("Oh No!", err, "error");
      } else {
        swal.stopLoading();
        swal.close();
      }
    })
	},
	'click #js-remove': function (event, templateInstance) {
		event.preventDefault()
		swal({
      title: `Are you sure?`,
      text: `This will remove current timecard and this action is not reversible.`,
      icon: 'warning',
      buttons: true,
      dangerMode: true
    }).then(confirmed => {
      if (confirmed) {
        deleteWork.call({
          workId: this._id
        }, (err, data) => {
          if (err) {
            notify(err.reason || err.message, 'error')
          } else {
            notify('Timecard removed', 'success')
          }
        })
      } else {
        notify('Operation Cancelled', 'error')
      }
    })
	}
})
