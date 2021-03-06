import { Template } from 'meteor/templating'
import { FlowRouter } from 'meteor/kadira:flow-router'

import './payments.html'

import { markAsPaid } from '/imports/api/payments/methods'
import { notify } from '/imports/modules/notifier'
import { Payments } from '/imports/api/payments/payments'


Template.payments.onCreated(function() {
    this.statuses = new ReactiveVar(['not-paid', 'payment-paid'])
    this.filter = new ReactiveVar({})

    this.autorun(() => {
        this.filter.set({
            status: {
                $in: this.statuses.get()
            }
        })
    })

    this.autorun(() => {
        this.subscribe('payments')
        this.subscribe('users')
    })
})

Template.payments.helpers({
    statusName: (status) => {
        switch (status) {
            case 'not-paid':
                return 'Not Paid'
                break;
            case 'payment-paid':
                return 'Paid'
                break;
        }

    },
    notPaid: (paymentId) => {
        //check to see if the payment has been made.
        let notPaid = Payments.findOne({ _id: paymentId, status: 'payment-paid' });

        return notPaid ? notPaid.status : null
    },
    fixed: val => val ? val.toFixed(2) : '0.00',
    getName: (owner) => {
        //return the users name from the userId
        let getName = Meteor.users.findOne({ _id: owner }).profile.name;
        return getName ? getName : null
    },
    getPaymentMethod: (owner) => {
        let paymentMethod = Meteor.users.findOne({ _id: owner }).profile.paymentMethod;
        return paymentMethod ? paymentMethod : '';
    },
    payments: () => Payments.find(Template.instance().filter.get(), {
            sort: {
                createAt: -1
            }
        })
})

Template.payments.events({    
    'click .review': function(event, templateInstance) {
        event.preventDefault()
        FlowRouter.go('/moderator/payments/'+this._id)
    },
    'click .filtersPanel': (event, templateInstance) => {
        templateInstance.statuses.set(Array.from($('.filtersPanel input:checked').map(function() {
            return $(this).val()
        })))
    }
})